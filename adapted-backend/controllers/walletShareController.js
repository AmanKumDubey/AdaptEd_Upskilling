const crypto = require('crypto');
const { eq, and, desc } = require('drizzle-orm');
const { db } = require('../db/client');
const { users, onboardingProfiles, assessmentResults, userCourses, courses, skillVerifications, walletShares } = require('../db/schema');
const { newId, withTimestamps } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

const CATEGORY_RULES = [
  { category: 'Data & AI', keywords: ['python', 'sql', 'machine learning', 'ml fundamentals', 'advanced ml', 'statistics', 'deep learning', 'tensorflow', 'pytorch', 'data', 'neural', 'nlp', 'transformers', 'llm', 'genai', 'rag', 'model', 'ai concepts', 'prompt', 'feature engineering'] },
  { category: 'Engineering', keywords: ['docker', 'aws', 'react', 'ci/cd', 'cloud', 'mlops', 'deployment', 'vector search', 'architecture'] },
  { category: 'Strategy & Governance', keywords: ['governance', 'risk', 'strategy', 'roi', 'vendor', 'ethics', 'fairness', 'leadership', 'economics'] },
  { category: 'Communication', keywords: ['communication', 'interview', 'portfolio', 'presentation', 'storytelling'] },
];

function categorize(name) {
  const normalized = name.toLowerCase();
  const match = CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.category || 'General';
}

// Server-side port of pathwise-app-v5's skillsEngine.js buildSkillsWallet() -
// needed here because the public wallet page has no logged-in session to run
// the frontend's own hook-based version against protected endpoints.
// `verifiedNames` (lowercased) comes from real SkillVerifications rows now,
// replacing the frontend's old score/course-count heuristic.
function buildSkillsWallet({ profileSkills, latestResult, completedCourses, verifiedNames }) {
  const registry = new Map();
  const upsert = (name, patch) => {
    if (!name) return;
    const key = name.toLowerCase();
    const existing = registry.get(key) || { name, category: categorize(name), level: 0, verified: verifiedNames.has(key), courses: 0 };
    registry.set(key, { ...existing, ...patch, verified: existing.verified || patch.verified || verifiedNames.has(key) });
  };

  (profileSkills || []).forEach((skill) => {
    const existing = registry.get(skill.toLowerCase());
    upsert(skill, { level: Math.max(existing?.level || 0, 35) });
  });

  (latestResult?.domainScores || []).forEach(({ domain, score }) => {
    const existing = registry.get(domain.toLowerCase());
    upsert(domain, { level: Math.max(existing?.level || 0, score) });
  });

  (completedCourses || []).forEach((course) => {
    (course?.skills || []).forEach((skill) => {
      const existing = registry.get(skill.toLowerCase());
      const courseCount = (existing?.courses || 0) + 1;
      upsert(skill, { courses: courseCount, level: Math.min(95, Math.max(existing?.level || 0, (existing?.level || 30) + 15)) });
    });
  });

  const skills = Array.from(registry.values()).sort((a, b) => b.level - a.level);
  return {
    skills,
    stats: {
      totalSkills: skills.length,
      verified: skills.filter((skill) => skill.verified).length,
      avgProficiency: skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length) : 0,
      coursesCompleted: completedCourses?.length || 0,
    },
  };
}

async function loadWalletForUser(userId) {
  const [[profile], [latestResult], completedRows, verifications] = await Promise.all([
    db.select({ data: onboardingProfiles.data }).from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1),
    db.select().from(assessmentResults).where(eq(assessmentResults.userId, userId)).orderBy(desc(assessmentResults.completedAt)).limit(1),
    db.select().from(userCourses).innerJoin(courses, eq(userCourses.courseId, courses.id))
      .where(and(eq(userCourses.userId, userId), eq(userCourses.status, 'completed'))),
    db.select({ skillName: skillVerifications.skillName }).from(skillVerifications).where(eq(skillVerifications.userId, userId)),
  ]);

  const verifiedNames = new Set(verifications.map((v) => v.skillName.toLowerCase()));
  const completedCourses = completedRows.map((row) => row.Courses);

  return buildSkillsWallet({
    profileSkills: profile?.data?.skills,
    latestResult,
    completedCourses,
    verifiedNames,
  });
}

// GET /api/me/wallet-share - returns the caller's existing share link,
// creating one lazily on first use.
const getMyShareLink = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const [existing] = await db.select().from(walletShares).where(eq(walletShares.userId, userId)).limit(1);
  if (existing) {
    return sendSuccess(res, 'Wallet share link retrieved successfully', { token: existing.token });
  }

  const token = crypto.randomBytes(24).toString('base64url');
  const [created] = await db.insert(walletShares).values(withTimestamps({ id: newId(), userId, token })).returning();
  sendSuccess(res, 'Wallet share link created successfully', { token: created.token });
});

// GET /api/public/wallet/:token - no auth. Read-only, first-name-only
// summary - never exposes email or the real userId.
const getPublicWallet = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const [share] = await db.select().from(walletShares).where(eq(walletShares.token, token)).limit(1);
  if (!share) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Wallet not found');
  }

  const [[user], [profile], wallet] = await Promise.all([
    db.select({ firstName: users.firstName }).from(users).where(eq(users.id, share.userId)).limit(1),
    db.select({ data: onboardingProfiles.data }).from(onboardingProfiles).where(eq(onboardingProfiles.userId, share.userId)).limit(1),
    loadWalletForUser(share.userId),
  ]);

  sendSuccess(res, 'Public wallet retrieved successfully', {
    // Prefer the onboarding profile's firstName - it's what the rest of the
    // app displays (e.g. Dashboard's "Good morning, X") - falling back to
    // the account's own registration name if onboarding was never completed.
    firstName: profile?.data?.firstName || user?.firstName || 'This learner',
    skills: wallet.skills,
    stats: wallet.stats,
  });
});

module.exports = { getMyShareLink, getPublicWallet };
