const mockProvider = {
  _launch: jest.fn(),
  _close: jest.fn(),
  fetchList: jest.fn(),
  fetchDetails: jest.fn()
};

jest.mock('../services/scrapers/providers/courseraProvider', () =>
  jest.fn(() => mockProvider)
);

jest.mock('../services/courseIngestService', () => ({
  upsertCourses: jest.fn()
}));

jest.mock('../services/reviewIngestService', () => ({
  upsertReviews: jest.fn()
}));

const { scrapeCoursera } = require('../controllers/coursesController');
const { upsertCourses } = require('../services/courseIngestService');

const courseCard = {
  externalId: '/learn/python',
  deepLink: 'https://www.coursera.org/learn/python',
  title: 'Python Course',
  imageUrl: null,
  rating: 4.8
};

const courseDetails = {
  externalId: '/learn/python',
  deepLink: 'https://www.coursera.org/learn/python',
  platform: 'coursera',
  certificationType: 'Course',
  level: 'Beginner',
  durationHours: 20,
  skills: ['Python'],
  learningOutcomes: ['Write Python programs'],
  instructors: [],
  shareable: true,
  enrolledCount: 1000,
  assessmentCount: 4,
  reviews: []
};

const createResponse = () => ({
  json: jest.fn()
});

describe('Coursera scraping controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider._launch.mockResolvedValue(undefined);
    mockProvider._close.mockResolvedValue(undefined);
    mockProvider.fetchList.mockResolvedValue({
      courseData: [courseCard],
      nextPageCursor: null
    });
    mockProvider.fetchDetails.mockResolvedValue(courseDetails);
    upsertCourses.mockResolvedValue([{
        id: 'saved-course-id',
        externalId: '/learn/python',
        platform: 'coursera'
    }]);
  });

  test('persists courses before returning success and always closes Chrome', async () => {
    const response = createResponse();
    const next = jest.fn();

    await scrapeCoursera({
      body: { query: 'python', pageSize: 1, maxPages: 1, reviewLimit: 0 },
      user: { userId: 'admin-user-id' }
    }, response, next);

    expect(upsertCourses).toHaveBeenCalledWith(expect.any(Array));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Scraped 1 Coursera course(s)',
      data: [expect.objectContaining({ id: 'saved-course-id', title: 'Python Course' })]
    }));
    expect(mockProvider._close).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  test('saves a list result when optional detail enrichment fails', async () => {
    mockProvider.fetchDetails.mockRejectedValue(new Error('detail timeout'));
    const response = createResponse();

    await scrapeCoursera({
      body: { query: 'python', pageSize: 1 },
      user: { userId: 'admin-user-id' }
    }, response, jest.fn());

    expect(upsertCourses).toHaveBeenCalledWith(
      [expect.objectContaining({
          externalId: '/learn/python',
          platform: 'coursera',
          title: 'Python Course',
          skills: []
      })]
    );
    expect(mockProvider._close).toHaveBeenCalledTimes(1);
  });

  test('returns an upstream error and closes Chrome when list scraping fails', async () => {
    mockProvider.fetchList.mockRejectedValue(new Error('search timeout'));
    const response = createResponse();
    const next = jest.fn();

    await scrapeCoursera({
      body: { query: 'python' },
      user: { userId: 'admin-user-id' }
    }, response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'search timeout',
      status: 502
    }));
    expect(response.json).not.toHaveBeenCalled();
    expect(mockProvider._close).toHaveBeenCalledTimes(1);
  });
});
