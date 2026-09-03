import express from 'express';

const router = express.Router();

const {
  getDashboard,
  searchCourses,
  toggleWishlist,
  enrollCourse,
  verifyCourseEnrollment,
  completeCourse,
} = require('../controllers/userCourseController');

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  courseIdParamSchema,
  toggleWishlistSchema,
  completeCourseSchema,
  userCourseSearchQuerySchema,
} = require('../schemas/courseSchemas');

// All routes below require the user to be authenticated
// This middleware verifies that JWT and sets req.user
router.use(authenticate);

// GET /api/me/courses/dashboard
// Returns both "continue learning" and "wishlist" sections for the current user
router.get('/courses/dashboard', getDashboard);

// GET /api/me/courses/search
// Search across the current user's in-progress, completed, and wishlisted courses
router.get('/courses/search', validate(userCourseSearchQuerySchema, 'query'), searchCourses);

// POST /api/me/courses/:courseId/wishlist
// Body: { isWishlist: boolean }
// Adds or removes a course from the user's wishlist
router.post(
  '/courses/:courseId/wishlist',
  validate(courseIdParamSchema, 'params'),
  validate(toggleWishlistSchema),
  toggleWishlist,
);

// POST /api/me/courses/:courseId/enroll
// Marks a course as pending_verification for the current user
router.post('/courses/:courseId/enroll', validate(courseIdParamSchema, 'params'), enrollCourse);

// POST /api/me/courses/:courseId/verify
// Marks a course as in_progress after the user verifies purchase (manually as of now)
router.post('/courses/:courseId/verify', validate(courseIdParamSchema, 'params'), verifyCourseEnrollment);

// POST /api/me/courses/:courseId/complete
// Marks a course as completed for the current user
router.post(
  '/courses/:courseId/complete',
  validate(courseIdParamSchema, 'params'),
  validate(completeCourseSchema),
  completeCourse,
);

module.exports = router;
