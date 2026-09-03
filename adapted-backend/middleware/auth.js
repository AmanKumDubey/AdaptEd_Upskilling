const { eq } = require('drizzle-orm');
const { db } = require('../db/client');
const { users } = require('../db/schema');
const { getAuth } = require('../auth/config');
const { sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS, USER_ROLES } = require('../utilities/constants');

// Phase B4: session lookup now goes through better-auth's own session store
// (the `session` table) instead of verifying a self-issued JWT. better-auth's
// bearer plugin accepts the same `Authorization: Bearer <token>` header shape
// the API already used, so no client-facing contract changes.
const getSessionFromRequest = async (req) => {
  const auth = await getAuth();
  const { fromNodeHeaders } = await import('better-auth/node');
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
};

// App-specific fields (role, username, isActive) live on our own Users table,
// not better-auth's `user` table - look them up by the shared id.
const loadProfile = async (userId) => {
  const [profile] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return profile || null;
};

// Authenticate user
const authenticate = asyncHandler(async (req, res, next) => {
  try {
    const session = await getSessionFromRequest(req);

    if (!session || !session.user) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Access token is required');
    }

    const profile = await loadProfile(session.user.id);

    if (!profile) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'User no longer exists');
    }

    if (!profile.isActive) {
      return sendError(res, HTTP_STATUS.FORBIDDEN, 'Account is deactivated');
    }

    req.user = {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      username: profile.username,
    };

    next();
  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token');
  }
});

// Authorize user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, HTTP_STATUS.FORBIDDEN, 'Insufficient permissions');
    }

    next();
  };
};

// Check if user is admin
const isAdmin = authorize(USER_ROLES.ADMIN);

// Check if user is admin or moderator
const isAdminOrModerator = authorize(USER_ROLES.ADMIN, USER_ROLES.MODERATOR);

// Optional authentication (for public routes that can benefit from user context)
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const session = await getSessionFromRequest(req);

    if (session && session.user) {
      const profile = await loadProfile(session.user.id);

      if (profile && profile.isActive) {
        req.user = {
          userId: profile.id,
          email: profile.email,
          role: profile.role,
          username: profile.username,
        };
      }
    }
  } catch (error) {
    // Ignore session errors for optional auth
  }

  next();
});

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isAdminOrModerator,
  optionalAuth
};
