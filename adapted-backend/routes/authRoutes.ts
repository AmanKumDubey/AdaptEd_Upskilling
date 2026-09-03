import express from 'express';

const router = express.Router();

// Import controllers
const {
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
} = require('../controllers/authController');

const {
  requestReset,
  verifyResetOTP,
  resetPassword,
} = require('../controllers/passwordResetController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, otpLimiter } = require('../middleware/rateLimit');
const {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  passwordChangeSchema,
  presignAvatarSchema,
  confirmAvatarSchema,
  deleteAccountSchema,
} = require('../schemas/authSchemas');
const { passwordForgotSchema, passwordVerifyOtpSchema, passwordResetSchema } = require('../schemas/passwordResetSchemas');

// Public routes - Phase B6: authLimiter throttles repeated register/login
// attempts per IP (closes the "no rate limiting on auth routes" gap).
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Social login (Google/LinkedIn) is handled entirely by better-auth's own
// routes under /api/auth/sign-in/social and /api/auth/callback/:provider -
// see server.ts's catch-all mount. The old hand-rolled OAuth flow (this
// file's previous googleStart/googleCallback/linkedinStart/linkedinCallback,
// backed by OAuthSessions/UserIdentities) issued its own JWT instead of a
// better-auth session, and redirected the frontend with a token in a URL
// query string that nothing in the actual frontend ever read - replaced
// rather than patched.

// Password Reset routes (also public) - otpLimiter is tighter than
// authLimiter since these guard a guessable 6-digit code.
router.post('/password/forgot', authLimiter, validate(passwordForgotSchema), requestReset);
router.post('/password/verify-otp', otpLimiter, validate(passwordVerifyOtpSchema), verifyResetOTP);
router.post('/password/reset', authLimiter, validate(passwordResetSchema), resetPassword);

// Protected routes (require authentication) - authenticate is applied per-route,
// not via a blanket router.use(authenticate), because a path-less router.use()
// runs for every request that reaches this point in the stack - including ones
// no route below it matches (e.g. /sign-in/social), which would 401 them before
// they ever fall through to server.ts's better-auth catch-all.
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(profileUpdateSchema), updateProfile);
router.put('/change-password', authenticate, validate(passwordChangeSchema), changePassword);
router.post('/logout', authenticate, logout);

router.post('/avatar/presign', authenticate, validate(presignAvatarSchema), presignAvatarUpload);
router.put('/avatar', authenticate, validate(confirmAvatarSchema), confirmAvatarUpload);
router.delete('/avatar', authenticate, removeAvatar);
router.delete('/account', authenticate, validate(deleteAccountSchema), deleteAccount);

module.exports = router;
