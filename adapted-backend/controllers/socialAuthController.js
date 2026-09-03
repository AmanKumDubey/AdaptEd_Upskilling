const { eq, and } = require('drizzle-orm');
const { db } = require('../db/client');
const { oauthSessions, userIdentities, users } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const {
  asyncHandler, sendSuccess, sendError, generateToken, sanitizeUser, hashPassword,
  randomString, pkceChallenge, buildOAuthAuthorizeUrl, exchangeCodeForTokens,
  verifyProviderIdToken, fetchLinkedInEmail,
  httpsGetJson
} = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

// username strategy: user-<random6>
const randomUsername = () => `user-${Math.random().toString(36).slice(2, 8)}`;
const ttlMinutes = () => parseInt(process.env.OAUTH_STATE_TTL_MINUTES || '10', 10);
const isSessionExpired = (session) => new Date() > new Date(session.expiresAt);

const getClientId = (provider) => {
    if (provider === 'google') return process.env.GOOGLE_CLIENT_ID;
    if (provider === 'linkedin') return process.env.LINKEDIN_CLIENT_ID;
    return null;
};

// helpers
const start = (provider) => asyncHandler(async (req, res) => {
    try {
        const state = randomString(24);
        const nonce = randomString(24);
        const codeVerifier = randomString(48);
        const codeChallenge = pkceChallenge(codeVerifier);
        const expiresAt = new Date(Date.now() + ttlMinutes() * 60 * 1000);

        await db.insert(oauthSessions).values(withTimestamps({
            id: newId(),
            provider,
            state,
            nonce,
            codeVerifier,
            userId: req.user ? req.user.userId : null,
            redirectUri: req.query.redirect || null,
            expiresAt,
        }));
        const authUrl = buildOAuthAuthorizeUrl(provider, { state, nonce, codeChallenge });
        return res.redirect(authUrl);
    } catch (error) {
        return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || 'Failed to start OAuth flow');
    }
});

const callback = (provider) => asyncHandler(async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            const desc = req.query.error_description || '';
            return sendError(res, HTTP_STATUS.BAD_REQUEST, `Provider error: ${error}${desc ? ' - ' + desc : ''}`);
        }
        if (!code || !state) {
            return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Missing code or state');
        }

        // Validate OAuthSession (state/nonce/expiry/single-use)
        const [session] = await db
          .select()
          .from(oauthSessions)
          .where(and(eq(oauthSessions.provider, provider), eq(oauthSessions.state, state)))
          .limit(1);
        if (!session) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid state');
        if (session.usedAt) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Session already used');
        if (isSessionExpired(session)) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Session expired');

        // Exchange code for tokens (PKCE: include code_verifier)
        const tokens = await exchangeCodeForTokens(provider, code, session.codeVerifier);
        // show provider error if present
        if (tokens && (tokens.error || tokens.error_description)) {
        return sendError(
            res,
            HTTP_STATUS.BAD_REQUEST,
            `Token exchange error: ${tokens.error || 'unknown'}${tokens.error_description ? ' - ' + tokens.error_description : ''}`
        );
        } if (!tokens || (!tokens.id_token && !tokens.access_token)) {
            return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid token response from provider');
        }

        // Verify ID token (RS256 sig + iss + aud + exp + nonce)
        const clientId = getClientId(provider);
        let idTokenPayload = null;

        if (tokens.id_token) {
            try {
                idTokenPayload = await verifyProviderIdToken({
                    provider,
                    idToken: tokens.id_token,
                    expectedNonce: session.nonce,
                    clientId
                });
            } catch (error) {
                if (provider === 'linkedin' && /Nonce (missing|mismatch)/i.test(error.message) && tokens.access_token) {
                    idTokenPayload = await httpsGetJson('https://api.linkedin.com/v2/userinfo', {
                        Authorization: `Bearer ${tokens.access_token}`,
                    });
                } else {
                    return sendError(res, HTTP_STATUS.BAD_REQUEST, `Invalid ID token: ${error.message}`);
                }
            }
        } else if (provider === 'linkedin' && tokens.access_token) {
            // Fallback only if provider ommitted id_token
            try {
                idTokenPayload = await httpsGetJson('https://api.linkedin.com/v2/userinfo', {
                    Authorization: `Bearer ${tokens.access_token}`,
                });
            } catch (_) {
                return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Missing ID token / userinfo');
            }
        }

        // Normalize profile
        const profile = {
            sub: idTokenPayload.sub,
            email: idTokenPayload.email || null,
            given_name: idTokenPayload.given_name || null,
            family_name: idTokenPayload.family_name || null,
            name: idTokenPayload.name || null,
            picture: idTokenPayload.picture || null,
        };

        // LinkedIn: often need a separate call to get email
        if (provider === 'linkedin' && !profile.email && tokens.access_token) {
            try {
                profile.email = await fetchLinkedInEmail(tokens.access_token);
            } catch (_) {
                // If still no email, we'll catch error below in the mapping step for first-time sign-in
            }
        }

        if (!profile.sub) {
            return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Missing provider subject (sub)');
        }

        // Decide flow: linking vs first time sign in
        let user = null;

        if (session.userId) {
            // Linking flow (user is already authenticated on app)
            [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
            if (!user) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Linking target user not found');

            const [existingIdentity] = await db
              .select()
              .from(userIdentities)
              .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.sub)))
              .limit(1);

            if (existingIdentity && existingIdentity.userId !== user.id) {
                return sendError(res, HTTP_STATUS.CONFLICT, 'This provider account is linked to another AdaptEd account');
            }

            await db.insert(userIdentities)
              .values(withTimestamps({ id: newId(), userId: user.id, provider, providerUserId: profile.sub, email: profile.email || null }))
              .onConflictDoUpdate({
                target: [userIdentities.provider, userIdentities.providerUserId],
                set: touch({ userId: user.id, email: profile.email || null }),
              });
        } else {
            // First-time social sign in (map by email per acceptance criteria)
            const email = (profile.email || '').trim().toLowerCase();
            if (!email) {
                return sendError(res, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'Provider did not return an email');
            }

            [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (!user) {
                // Create new user. Password hashing was previously a Sequelize
                // beforeSave hook - now done explicitly (Drizzle has no equivalent).
                const tempPassword = randomString(15);
                const hashedTempPassword = await hashPassword(tempPassword);
                [user] = await db.insert(users).values(withTimestamps({
                    id: newId(),
                    username: randomUsername(),
                    email,
                    password: hashedTempPassword,
                    firstName: profile.given_name || null,
                    lastName: profile.family_name || null,
                    avatar: profile.picture || null,
                    isEmailVerified: true,
                    onboardingCompleted: true,
                })).returning();
            }

            const [existingIdentity] = await db
              .select()
              .from(userIdentities)
              .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.sub)))
              .limit(1);

            if (existingIdentity && existingIdentity.userId !== user.id) {
                return sendError(res, HTTP_STATUS.CONFLICT, 'This provider account is linked to another AdaptEd account');
            }

            await db.insert(userIdentities)
              .values(withTimestamps({ id: newId(), userId: user.id, provider, providerUserId: profile.sub, email }))
              .onConflictDoUpdate({
                target: [userIdentities.provider, userIdentities.providerUserId],
                set: touch({ userId: user.id, email }),
              });
        }

        // Mark session used
        await db.update(oauthSessions).set(touch({ usedAt: new Date() })).where(eq(oauthSessions.id, session.id));

        // Issue app session JWT
        const token = generateToken({ userId: user.id, email: user.email, role: user.role });

        // Get frontend URL from environment or use default
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Check if user needs onboarding
        const needsOnboarding = !user.onboardingCompleted;
        const redirectPath = needsOnboarding ? '/onboarding' : '/dashboard';

        // Redirect to frontend with token as query parameter
        const redirectUrl = `${frontendUrl}${redirectPath}?token=${encodeURIComponent(token)}`;

        return res.redirect(redirectUrl);

    } catch (error) {
        const message = error && error.message ? error.message : 'OAuth callback failed';
        const status = error && error.status ? error.status : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return sendError(res, status, message);
    }
});

const googleStart = start('google');
const googleCallback = callback('google');
const linkedinStart = start('linkedin');
const linkedinCallback = callback('linkedin');

module.exports = {
    googleStart,
    googleCallback,
    linkedinStart,
    linkedinCallback
};
