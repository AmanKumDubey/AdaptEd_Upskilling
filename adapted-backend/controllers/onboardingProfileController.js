const { eq } = require('drizzle-orm');
const { db } = require('../db/client');
const { onboardingProfiles } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const { sendSuccess, asyncHandler } = require('../utilities/helpers/helper');

const toPayload = (row) => ({
  ...row.data,
  onboardingCompleted: row.onboardingCompleted,
  completedAt: row.completedAt,
});

// GET /api/me/onboarding-profile
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const [row] = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1);
  sendSuccess(res, 'Onboarding profile retrieved successfully', { profile: row ? toPayload(row) : null });
});

// PUT /api/me/onboarding-profile - always a full replace (mirrors the
// frontend's saveOnboardingProfile(), which has never supported a partial
// update either)
const saveProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const data = req.body;

  const [existing] = await db.select({ id: onboardingProfiles.id }).from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1);

  let row;
  if (existing) {
    [row] = await db.update(onboardingProfiles)
      .set(touch({ data, onboardingCompleted: true, completedAt: new Date() }))
      .where(eq(onboardingProfiles.id, existing.id))
      .returning();
  } else {
    [row] = await db.insert(onboardingProfiles).values(withTimestamps({
      id: newId(),
      userId,
      data,
      onboardingCompleted: true,
      completedAt: new Date(),
    })).returning();
  }

  sendSuccess(res, 'Onboarding profile saved successfully', { profile: toPayload(row) });
});

module.exports = { getProfile, saveProfile };
