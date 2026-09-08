import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { saveOnboardingProfileSchema } = require('../schemas/onboardingProfileSchemas');
const { getProfile, saveProfile } = require('../controllers/onboardingProfileController');

router.use(authenticate);

router.get('/', getProfile);
router.put('/', validate(saveOnboardingProfileSchema), saveProfile);

module.exports = router;
