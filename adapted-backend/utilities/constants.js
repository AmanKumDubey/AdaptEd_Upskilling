// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Response Messages
const MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  DUPLICATE_ENTRY: 'Resource already exists'
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
};

// Database Collections
const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  CATEGORIES: 'categories'
};

// Validation Rules
const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// JWT
const JWT = {
  EXPIRES_IN: '7d',
  ALGORITHM: 'HS256'
};

// File Upload
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  UPLOAD_PATH: './uploads/'
};

// Onboarding constants
const ONBOARDING_GOALS = [
  'Learn Data Science & AI',
  'Prepare for a Certification Exam',
  'Master a New Software Tool',
  'Start a Career in Tech',
  'Build a Portfolio Project',
  'Learn Programming Language',
  'Learn Robotics',
  'Cyber Security',
  'Digital Marketing'
];

const ONBOARDING_INTERESTS = [
  'Education',
  'Business',
  'Marketing',
  'Design',
  'Development',
  'Finance',
  'Technology',
  'Deployment'
];

const EXPERIENCE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced'
];

const THEME_PREFERENCES = [
  'light',
  'dark'
];

// Social Login Provider constants
const OAUTH_PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
    defaultScopes: ['openid', 'email', 'profile'],
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    usePkce: true,
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    discoveryUrl: 'https://www.linkedin.com/oauth/.well-known/openid-configuration',
    defaultScopes: ['openid', 'profile', 'email'],
    issuers: ['https://www.linkedin.com', 'https://www.linkedin.com/oauth',
      'https://www.linkedin.com/oauth/'],
    usePkce: false,
  }
};

// OTP/Password Reset constants
const {
  RESET_OTP_LENGTH = '6',
  RESET_OTP_TTL_MINUTES = '5',
  RESET_MAX_ATTEMPTS = '3',
  RESET_SESSION_TTL = '15m',
  NODE_ENV,
  JWT_SECRET
} = process.env;

const RESET = {
  OTP_LENGTH: parseInt(RESET_OTP_LENGTH, 10),
  OTP_TTL_MINUTES: parseInt(RESET_OTP_TTL_MINUTES, 10),
  MAX_ATTEMPTS: parseInt(RESET_MAX_ATTEMPTS, 10),
  SESSION_TTL: RESET_SESSION_TTL
};

// Scraper Platform Provider Constants
const PLATFORMS = {
  COURSERA: 'coursera',
  UDEMY: 'udemy',
  SKILLSHARE: 'skillshare'
};

module.exports = {
  HTTP_STATUS,
  MESSAGES,
  USER_ROLES,
  COLLECTIONS,
  VALIDATION,
  PAGINATION,
  JWT,
  FILE_UPLOAD,
  ONBOARDING_GOALS,
  ONBOARDING_INTERESTS,
  EXPERIENCE_LEVELS,
  THEME_PREFERENCES,
  OAUTH_PROVIDERS,
  RESET,
  PLATFORMS
};
