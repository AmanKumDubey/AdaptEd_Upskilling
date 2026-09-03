import express from 'express';

const router = express.Router();

// Import controllers
const { completeOnboarding, getOnboardingData } = require('../controllers/onboardingController');

// Import middleware
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { completeOnboardingSchema } = require('../schemas/onboardingSchemas');

// Public route - Complete onboarding in single request
router.post('/complete', validate(completeOnboardingSchema), completeOnboarding);

// Public route with optional auth - Get onboarding data and options
router.get('/', optionalAuth, getOnboardingData);

module.exports = router;
