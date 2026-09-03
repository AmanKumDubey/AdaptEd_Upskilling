const { eq } = require('drizzle-orm');
const { db } = require('../db/client');
const { users, authUser } = require('../db/schema');
const { withTimestamps, touch } = require('../db/helpers');
const { getAuth } = require('../auth/config');
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

  const userData = sanitizeUser(user);
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

  const userData = sanitizeUser(updated);

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

  const userData = sanitizeUser(user);

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

    const userData = sanitizeUser(user);

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

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
