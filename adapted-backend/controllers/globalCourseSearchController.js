const {
    sendSuccess,
    sendError,
    asyncHandler
} = require('../utilities/helpers/helper');

const { HTTP_STATUS } = require('../utilities/constants');
const { searchGlobalCourses } = require('../services/globalCourseSearchService');

// Controller: globalSearch
//
// This controller supports BOTH endpoints:
// - GET /api/courses/search (public, optionalAuth)
// - GET /api/me/courses/global-search (auth)
//
// It:
// - validates input
// - extracts query params
// - calls service
// - returns standardized sendSuccess output
const globalSearch = asyncHandler(async (req, res) => {
    // optionalAuth or auth middleware may populate req.user
    // If no auth, userId is null and AI will use baseline tags only
    console.log('globalSearch req.user:', req.user);

    const userId = req.user?.userId || null;

    // Read query params (filters + sort + pagination)
    const {
        q,
        fields,
        match,
        sort,
        platform,
        level,
        certificationType,
        minRating,
        maxRating,
        page,
        pageSize,
        ai
    } = req.query;

    // Enforce required keyword search
    if (!q || !String(q).trim()) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Missing required query parameter: q');
    }

    // Delegate business logic to service (MVC separation)
    const result = await searchGlobalCourses({
        userId,
        q,
        fields: fields ? String(fields).split(',') : undefined,
        match: match || 'all',
        sort: sort || 'relevance',
        page: page || 1,
        pageSize: pageSize || 20,
        filters: {
            platform,
            level,
            certificationType,
            minRating,
            maxRating
        },
        // ai defaults to true unless explicitly set to false
        ai: typeof ai === 'undefined' ? true : String(ai).toLowerCase() !== 'false'
    });

    return sendSuccess(res, 'Global course search', {
        data: result.data,
        meta: result.meta
    });
});

module.exports = { globalSearch };