const crypto = require('crypto');
const { eq } = require('drizzle-orm');
const { db } = require('../db/client');
const { users, authUser } = require('../db/schema');
const { withTimestamps, touch } = require('../db/helpers');
const { getAuth } = require('../auth/config');
const { presignPutObject, presignGetObject, deleteObject } = require('../services/s3Service');
const {
  sendSuccess,
  sendError,
  sanitizeUser,
  asyncHandler,
} = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

const displayName = ({ firstName, lastName, username }) => {
  const full = `${firstName || ''} ${lastName || ''}`.trim();
  return full || username;
};

// Every response that includes a user object goes through this so the
// frontend can always just <img src={user.avatarUrl}> - the bucket stays
// private, so `avatar` (the raw S3 key) is only ever useful server-side to
// mint a fresh short-lived signed GET url on the way out.
const withAvatarUrl = async (userData) => {
  if (!userData.avatar) return { ...userData, avatarUrl: null };
  const { downloadUrl } = await presignGetObject({ key: userData.avatar, expiresInSeconds: 900 });
  return { ...userData, avatarUrl: downloadUrl };
};

const sanitizeFileName = (fileName) => {
  const base = String(fileName || '').trim().split('/').pop().split('\\').pop();
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'avatar';
};

const buildAvatarKey = ({ userId, fileName }) => {
  const rand = crypto.randomBytes(10).toString('hex');
  return `avatars/${userId}/${Date.now()}-${rand}-${sanitizeFileName(fileName)}`;
};

// Register new user
const register = asyncHandler(async (req, res) => {
  // Phase B2: field-shape validation (email format, password length, username
  // format) now happens in schemas/authSchemas.ts via the validate() middleware
  // before this controller runs - req.body is already known-good here.
  const { username, email, password, firstName, lastName, phone, goals, interests, experienceLevel, themePreference } = req.body;

  // Check if user already exists (our own Users table remains the source of
  // truth for "does this account already exist" - username has no equivalent
  // on better-auth's own user table).
  const { or } = require('drizzle-orm');
  const existingUserConditions = [eq(users.email, email)];
  if (username) existingUserConditions.push(eq(users.username, username));

  const [existingUser] = await db.select().from(users).where(or(...existingUserConditions)).limit(1);

  if (existingUser) {
    return sendError(res, HTTP_STATUS.CONFLICT, 'User with this email or username already exists');
  }

  const finalUsername = username || `user-${Math.random().toString(36).slice(2, 8)}`;

  // Phase B4: better-auth owns identity + credential (user + account tables).
  // This creates both in one call (and already returns a bearer token directly
  // in its response body - no separate sign-in round trip needed); the
  // returned user.id is then reused as the primary key for our own profile
  // row, keeping the two tables in lockstep.
  const auth = await getAuth();
  let signUpResult;
  try {
    signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: displayName({ firstName, lastName, username: finalUsername }),
      },
    });
  } catch (error) {
    return sendError(res, HTTP_STATUS.CONFLICT, error.body?.message || 'Unable to register user');
  }

  const authUserId = signUpResult.user.id;

  // Phase B7: auth/config.ts's databaseHooks.user.create.after already fires
  // during signUpEmail() above and inserts a bare-minimum row for this same
  // id (the hook has no access to this request's form fields, only the name/
  // email better-auth itself knows) - upsert so this enriches that row
  // instead of colliding with it on the primary key.
  const registrationFields = {
    username: finalUsername,
    email,
    // Phase B4: password now lives on better-auth's account table; this column
    // is unused going forward but kept (nullable-in-practice via a placeholder)
    // until a later cleanup phase drops it from the schema.
    password: 'managed-by-better-auth',
    firstName,
    lastName,
    phone,
    goals: goals || [],
    interests: interests || [],
    experienceLevel: experienceLevel || null,
    themePreference: themePreference || 'light',
    onboardingCompleted: true,
    lastLogin: new Date(),
  };
  const [user] = await db.insert(users)
    .values(withTimestamps({ id: authUserId, ...registrationFields }))
    .onConflictDoUpdate({ target: users.id, set: touch(registrationFields) })
    .returning();

  const userData = await withAvatarUrl(sanitizeUser(user));
  sendSuccess(res, 'User registered successfully', {
    user: userData,
    token: signUpResult.token,
  }, HTTP_STATUS.CREATED);
});

// Login user
const login = asyncHandler(async (req, res) => {
  // Phase B2: email format + password presence already enforced by loginSchema.
  const { email, password } = req.body;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials');
  }
  if (!user.isActive) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'Account is deactivated');
  }

  const auth = await getAuth();
  let signInResult;
  try {
    signInResult = await auth.api.signInEmail({ body: { email, password } });
  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials');
  }

  const [updated] = await db.update(users).set(touch({ lastLogin: new Date() })).where(eq(users.id, user.id)).returning();

  const userData = await withAvatarUrl(sanitizeUser(updated));

  sendSuccess(res, 'Login successful', {
    user: userData,
    token: signInResult.token,
  });
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);

  if (!user) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  const userData = await withAvatarUrl(sanitizeUser(user));

  sendSuccess(res, 'Profile retrieved successfully', {
    user: userData
  });
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, gender, country, goals, interests, email } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
  }

  try {
    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!existing) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName === '' ? null : firstName;
    if (lastName !== undefined) updateData.lastName = lastName === '' ? null : lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (country !== undefined) updateData.country = country;
    if (goals !== undefined) updateData.goals = goals;
    if (interests !== undefined) updateData.interests = interests;
    if (email !== undefined && email !== null) updateData.email = email;

    const [user] = await db.update(users).set(touch(updateData)).where(eq(users.id, userId)).returning();

    // Phase B4: keep better-auth's own user record (email/name) in sync, since
    // it - not our Users table - is what login actually checks against.
    const authUpdate = {};
    if (updateData.email) authUpdate.email = updateData.email;
    if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
      authUpdate.name = displayName({ firstName: user.firstName, lastName: user.lastName, username: user.username });
    }
    if (Object.keys(authUpdate).length) {
      await db.update(authUser).set(touch(authUpdate)).where(eq(authUser.id, userId));
    }

    const userData = await withAvatarUrl(sanitizeUser(user));

    sendSuccess(res, 'Profile updated successfully', {
      user: userData
    });
  } catch (error) {
    return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update profile');
  }
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  // Phase B2: presence + format of both fields already enforced by passwordChangeSchema.
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  const auth = await getAuth();
  const { fromNodeHeaders } = await import('better-auth/node');

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: false },
      headers: fromNodeHeaders(req.headers),
    });
  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Current password is incorrect');
  }

  sendSuccess(res, 'Password changed successfully');
});

// Log out - actually revokes the session server-side (the old JWT could never
// be invalidated before its 7-day expiry; this is the gap B4 was meant to close).
const logout = asyncHandler(async (req, res) => {
  const auth = await getAuth();
  const { fromNodeHeaders } = await import('better-auth/node');

  try {
    await auth.api.signOut({ headers: fromNodeHeaders(req.headers) });
  } catch (error) {
    // Already-invalid/expired session: logging out is a no-op, not an error.
  }

  sendSuccess(res, 'Logged out successfully');
});

// POST /api/auth/avatar/presign  { fileName, contentType } -> a presigned S3
// PUT url the client uploads the image bytes to directly (bucket stays
// private - see withAvatarUrl for how it's ever read back).
const presignAvatarUpload = asyncHandler(async (req, res) => {
  const { fileName, contentType } = req.body;
  const key = buildAvatarKey({ userId: req.user.userId, fileName });

  const { uploadUrl, bucket, expiresInSeconds } = await presignPutObject({
    key,
    contentType,
    expiresInSeconds: 300,
  });

  sendSuccess(res, 'Upload URL created', { uploadUrl, key, bucket, expiresInSeconds });
});

// PUT /api/auth/avatar  { key } - called after the client's own PUT to the
// presigned url above succeeds, to actually attach that image to the profile.
const confirmAvatarUpload = asyncHandler(async (req, res) => {
  const { key } = req.body;
  const userId = req.user.userId;

  // The key must be one this user was actually issued (avatars/<userId>/...) -
  // without this a client could point their profile at any arbitrary S3 key.
  if (!key.startsWith(`avatars/${userId}/`)) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'Invalid upload key');
  }

  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  const previousAvatar = existing.avatar;
  const [user] = await db.update(users).set(touch({ avatar: key })).where(eq(users.id, userId)).returning();

  // Best-effort cleanup of the image being replaced - never block the
  // response on it, a stray old object isn't worth failing this request.
  if (previousAvatar && previousAvatar !== key) {
    deleteObject({ key: previousAvatar }).catch(() => {});
  }

  const userData = await withAvatarUrl(sanitizeUser(user));
  sendSuccess(res, 'Profile photo updated', { user: userData });
});

// DELETE /api/auth/avatar - removes the photo, reverting to the initials
// fallback the frontend already renders when avatarUrl is null.
const removeAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  const [user] = await db.update(users).set(touch({ avatar: null })).where(eq(users.id, userId)).returning();

  if (existing.avatar) {
    deleteObject({ key: existing.avatar }).catch(() => {});
  }

  const userData = await withAvatarUrl(sanitizeUser(user));
  sendSuccess(res, 'Profile photo removed', { user: userData });
});

// DELETE /api/auth/account  { confirmation: "DELETE" } - deactivates rather
// than hard-deletes: isActive is the same flag authenticate()/login() already
// gate on ("Account is deactivated"), so this immediately locks the account
// out everywhere with no risky cascading deletes across org membership,
// certificates, etc. Reversible by an admin later; not exposed via the API.
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  await db.update(users).set(touch({ isActive: false })).where(eq(users.id, userId));
  sendSuccess(res, 'Account deleted');
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  presignAvatarUpload,
  confirmAvatarUpload,
  removeAvatar,
  deleteAccount,
};
