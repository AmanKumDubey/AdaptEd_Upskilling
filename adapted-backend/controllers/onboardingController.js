const { eq, or } = require('drizzle-orm');
const { db } = require('../db/client');
const { users } = require('../db/schema');
const { newId, withTimestamps } = require('../db/helpers');
const {
  sendSuccess,
  sendError,
  generateToken,
  hashPassword,
  sanitizeUser,
  asyncHandler
} = require('../utilities/helpers/helper');
const {
  HTTP_STATUS,
  ONBOARDING_GOALS,
  ONBOARDING_INTERESTS,
  EXPERIENCE_LEVELS,
  THEME_PREFERENCES
} = require('../utilities/constants');

// Complete onboarding flow in single request
const completeOnboarding = asyncHandler(async (req, res) => {
  // Phase B2: username/email/password/confirmPassword/goals/interests/
  // experienceLevel/themePreference shape is already enforced by
  // completeOnboardingSchema via the validate() middleware before this runs.
  const {
    username,
    email,
    password,
    goals,
    interests,
    experienceLevel,
    themePreference
  } = req.body;

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);

  if (existingUser) {
    return sendError(res, HTTP_STATUS.CONFLICT, 'User with this email or username already exists');
  }

  // Phase B3: password hashing was previously a Sequelize beforeSave hook -
  // now done explicitly since Drizzle has no equivalent lifecycle hook.
  const hashedPassword = await hashPassword(password);

  const [user] = await db.insert(users).values(withTimestamps({
    id: newId(),
    username,
    email,
    password: hashedPassword,
    goals,
    interests,
    experienceLevel,
    themePreference,
    onboardingCompleted: true,
    lastLogin: new Date(),
  })).returning();

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  const userData = sanitizeUser(user);

  sendSuccess(res, 'Onboarding completed successfully', {
    user: userData,
    token
  }, HTTP_STATUS.CREATED);
});

// Get onboarding data and available options
const getOnboardingData = asyncHandler(async (req, res) => {
  // If user is authenticated, return their data
  if (req.user) {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    const userData = sanitizeUser(user);

    return sendSuccess(res, 'User onboarding data retrieved', {
      user: userData,
      onboardingCompleted: user.onboardingCompleted,
      availableOptions: {
        goals: ONBOARDING_GOALS,
        interests: ONBOARDING_INTERESTS,
        experienceLevels: EXPERIENCE_LEVELS,
        themePreferences: THEME_PREFERENCES
      }
    });
  }

  // If no user, just return available options
  sendSuccess(res, 'Onboarding options retrieved', {
    availableOptions: {
      goals: ONBOARDING_GOALS,
      interests: ONBOARDING_INTERESTS,
      experienceLevels: EXPERIENCE_LEVELS,
      themePreferences: THEME_PREFERENCES
    }
  });
});

module.exports = {
  completeOnboarding,
  getOnboardingData
};
