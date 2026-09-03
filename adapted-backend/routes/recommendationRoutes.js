const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const {
    getMyRecommendations,
    refreshMyRecommendations
} = require('../controllers/recommendationController');

// All recommendation routes require auth (user-specific)
router.use(authenticate);

// GET /api/me/dashboard/recommendations
//
//  - Returns current recommendations if they exist
//  - If expired/missing, schedules worker generation and returns either:
//      (1) old recs + meta.refreshing=true, OR
//      (2) empty + meta.status="generating" (new user state)
router.get('/dashboard/recommendations', getMyRecommendations);

// POST /api/me/dashboard/recommendations/refresh
//
//  - Forces a refresh immediately
//  - Still returns existing recs immediately (if any)
//  - Worker will swap the batch once finished
router.post('/dashboard/recommendations/refresh', refreshMyRecommendations);

module.exports = router;