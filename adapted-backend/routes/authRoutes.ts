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
} = require('../controllers/authController');

const {
  googleStart,
  googleCallback,
  linkedinStart,
  linkedinCallback,
} = require('../controllers/socialAuthController');

const {
  requestReset,
  verifyResetOTP,
  resetPassword,
} = require('../controllers/passwordResetController');

// Import middleware
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, otpLimiter } = require('../middleware/rateLimit');
const { registerSchema, loginSchema, profileUpdateSchema, passwordChangeSchema } = require('../schemas/authSchemas');
const { passwordForgotSchema, passwordVerifyOtpSchema, passwordResetSchema } = require('../schemas/passwordResetSchemas');

// Public routes - Phase B6: authLimiter throttles repeated register/login
// attempts per IP (closes the "no rate limiting on auth routes" gap).
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Social login routes (also public)
router.get('/google/start', optionalAuth, googleStart);
router.get('/google/callback', googleCallback);
router.get('/linkedin/start', optionalAuth, linkedinStart);
router.get('/linkedin/callback', linkedinCallback);

// Password Reset routes (also public) - otpLimiter is tighter than
// authLimiter since these guard a guessable 6-digit code.
router.post('/password/forgot', authLimiter, validate(passwordForgotSchema), requestReset);
router.post('/password/verify-otp', otpLimiter, validate(passwordVerifyOtpSchema), verifyResetOTP);
router.post('/password/reset', authLimiter, validate(passwordResetSchema), resetPassword);

// Protected routes (require authentication)
router.use(authenticate); // Apply authentication to all routes below

router.get('/profile', getProfile);
router.put('/profile', validate(profileUpdateSchema), updateProfile);
router.put('/change-password', validate(passwordChangeSchema), changePassword);
router.post('/logout', logout);

module.exports = router;
