import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { listMyAssignments } = require('../controllers/assessmentAssignmentController');

router.use(authenticate);

// GET /api/me/assessment-assignments
router.get('/', listMyAssignments);

module.exports = router;
