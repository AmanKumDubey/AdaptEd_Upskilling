import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { listMySkillVerifications } = require('../controllers/skillVerificationController');

router.use(authenticate);

// GET /api/me/skill-verifications
router.get('/', listMySkillVerifications);

module.exports = router;
