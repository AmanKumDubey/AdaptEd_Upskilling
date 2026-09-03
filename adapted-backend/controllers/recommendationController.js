const {
    sendSuccess,
    sendError,
    asyncHandler,
    randomString
} = require('../utilities/helpers/helper');

const { HTTP_STATUS } = require('../utilities/constants');

const {
    readRecommendationForUser,
    scheduleRecommendationGeneration
} = require('../services/recommendationService');

// GET /api/me/dashboard/recommendations
//
// Controller responsibilities:
//  1) Identify user (req.user.userId)
//  2) Read recommendation record (and format output for frontend)
//  3) if expired/missing, schedule generation for the worker
//  4) Return quickly (never do heavy AI work here)
const getMyRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Read the recommendation in a frontend-friendly format (courses + badges)
    const rec = await readRecommendationForUser({ userId });

    // If missing or expired, schedule generation
    // IMPORTANT: we still return immediately with either:
    //  - existing courses (refreshing=true)
    //  - or empty (new user edge case, status=generating)
    if (rec.meta.shouldGenerate === true) {
        await scheduleRecommendationGeneration({
            userId,
            // generationToken helps debugging "this refresh attempt"
            generationToken: randomString(12),
            force: false
        });
    }

    return sendSuccess(res, 'User recommendations', {
        data: rec.data,
        meta: rec.meta
    });
});

// POST /api/me/dashboard/recommendations/refresh
//
// Force refresh regardless of expiry
// Returns existing recs immediately (if any), and worker will swap later.
const refreshMyRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Always schedule generation now (force=true)
    await scheduleRecommendationGeneration({
        userId,
        generationToken: randomString(12),
        force: true
    });

    // Returm whatever the user currently has (frontend keeps showing old list)
    const rec = await readRecommendationForUser({ userId });

    return sendSuccess(res, 'Recommendation refresh scheduled', {
        data: rec.data,
        meta: {
            ...rec.meta,
            refreshing: true
        }
    }, HTTP_STATUS.OK);
});

module.exports = {
    getMyRecommendations,
    refreshMyRecommendations
};
