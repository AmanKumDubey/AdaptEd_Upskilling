jest.mock('../controllers/coursesController', () => ({
  listCourses: jest.fn(),
  getCourseById: jest.fn(),
  scrapeCoursera: jest.fn()
}));

jest.mock('../controllers/globalCourseSearchController', () => ({
  globalSearch: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  optionalAuth: jest.fn(),
  authenticate: jest.fn(),
  isAdminOrModerator: jest.fn()
}));

// Phase B2: routes now also run a Zod validate() middleware. validate() itself
// returns a fresh closure per call, so it's mocked to a stable reference here
// purely so this structural test can assert on it.
const mockValidateMiddleware = jest.fn();
jest.mock('../middleware/validate', () => ({
  validate: jest.fn(() => mockValidateMiddleware),
}));

const router = require('../routes/courseRoutes');
const { authenticate, isAdminOrModerator } = require('../middleware/auth');
const { scrapeCoursera } = require('../controllers/coursesController');

describe('course routes', () => {
  test('protects the Coursera scraper with authentication, role authorization, and request validation', () => {
    const layer = router.stack.find(item => item.route?.path === '/courses/scrape/coursera');
    const handlers = layer.route.stack.map(item => item.handle);

    expect(handlers).toEqual([authenticate, isAdminOrModerator, mockValidateMiddleware, scrapeCoursera]);
  });
});
