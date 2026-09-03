import express from 'express';

const router = express.Router();
const { listCourses, getCourseById, scrapeCoursera } = require('../controllers/coursesController');

// optionalAuth lets us personalize if token exists,
// but still allow anonymous searching.
const { optionalAuth, authenticate, isAdminOrModerator } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  courseIdRouteParamSchema,
  scrapeCourseraSchema,
  listCoursesQuerySchema,
  globalCourseSearchQuerySchema,
} = require('../schemas/courseSchemas');

// Controller for global course search
const { globalSearch } = require('../controllers/globalCourseSearchController');

// Global course search (public; personalized if token is provided)
router.get('/courses/search', optionalAuth, validate(globalCourseSearchQuerySchema, 'query'), globalSearch);

// This file likely has authenticate middleware already applied,
// so this route becomes auth-only.
router.get('/courses/global-search', authenticate, validate(globalCourseSearchQuerySchema, 'query'), globalSearch);

// Public catalog API
router.get('/courses', validate(listCoursesQuerySchema, 'query'), listCourses);
router.get('/courses/:id', validate(courseIdRouteParamSchema, 'params'), getCourseById);

// Phase 1 security: scraping changes the shared course catalog, so only authenticated
// admins or moderators may trigger this expensive external operation.
router.post(
  '/courses/scrape/coursera',
  authenticate,
  isAdminOrModerator,
  validate(scrapeCourseraSchema),
  scrapeCoursera,
);

// router.use(authenticate);

module.exports = router;
