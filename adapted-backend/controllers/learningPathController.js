const { eq, desc } = require('drizzle-orm');
const { db } = require('../db/client');
const { learningPaths, assessmentResults } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');
const {
  generateLearningPath,
  startModule,
  completeModule,
  resetProgress,
} = require('../services/learningPathEngine');

// The stored row already matches the shape pathwise-app-v5's learningPathEngine.js
// expects a `path` object to have (stages/completedModuleIds/currentModuleId/
// etc. line up field-for-field) - module *status* stays a pure client-side
// derivation over that shape, so nothing needs transforming on the way out.

// GET /api/me/learning-path
const getPath = asyncHandler(async (req, res) => {
  const [row] = await db.select().from(learningPaths).where(eq(learningPaths.userId, req.user.userId)).limit(1);
  sendSuccess(res, 'Learning path retrieved', { path: row || null });
});

// POST /api/me/learning-path/generate  { targetRole?, hoursPerWeek?,
// learningFormats?, learningPace?, sourceFingerprint? }
// A new generation replaces any existing path for this user (same
// "regenerate destroys progress" behavior the frontend already had).
const generatePath = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { targetRole, hoursPerWeek, learningFormats, learningPace, sourceFingerprint } = req.body;

  const [result] = await db.select().from(assessmentResults)
    .where(eq(assessmentResults.userId, userId))
    .orderBy(desc(assessmentResults.completedAt))
    .limit(1);

  if (!result) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Complete an assessment before generating a learning path');
  }

  const generated = generateLearningPath({ targetRole, hoursPerWeek, learningFormats, learningPace }, result);

  const values = {
    userId,
    personaId: generated.personaId,
    targetRole: generated.targetRole,
    currentLevel: generated.currentLevel,
    targetLevel: generated.targetLevel,
    assessmentScore: generated.assessmentScore,
    hoursPerWeek: generated.hoursPerWeek,
    learningFormats: generated.learningFormats,
    learningPace: generated.learningPace,
    priorityGaps: generated.priorityGaps,
    estimatedWeeks: generated.estimatedWeeks,
    totalHours: generated.totalHours,
    stages: generated.stages,
    completedModuleIds: generated.completedModuleIds,
    currentModuleId: generated.currentModuleId,
    sourceFingerprint: sourceFingerprint || null,
    generatedAt: new Date(),
  };

  const [row] = await db.insert(learningPaths)
    .values(withTimestamps({ id: newId(), ...values }))
    .onConflictDoUpdate({ target: learningPaths.userId, set: touch(values) })
    .returning();

  sendSuccess(res, 'Learning path generated', { path: row }, HTTP_STATUS.CREATED);
});

// PUT /api/me/learning-path/modules/:moduleId/start
const startModuleHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { moduleId } = req.params;

  const [row] = await db.select().from(learningPaths).where(eq(learningPaths.userId, userId)).limit(1);
  if (!row) return sendError(res, HTTP_STATUS.NOT_FOUND, 'No learning path found');

  const progress = startModule(row.stages, row.completedModuleIds, row.currentModuleId, moduleId);
  if (!progress) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'That module is locked or does not exist');

  const [updated] = await db.update(learningPaths).set(touch(progress)).where(eq(learningPaths.userId, userId)).returning();
  sendSuccess(res, 'Module started', { path: updated });
});

// PUT /api/me/learning-path/modules/:moduleId/complete
const completeModuleHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { moduleId } = req.params;

  const [row] = await db.select().from(learningPaths).where(eq(learningPaths.userId, userId)).limit(1);
  if (!row) return sendError(res, HTTP_STATUS.NOT_FOUND, 'No learning path found');

  const progress = completeModule(row.stages, row.completedModuleIds, row.currentModuleId, moduleId);
  if (!progress) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'That module is locked or does not exist');

  const [updated] = await db.update(learningPaths).set(touch(progress)).where(eq(learningPaths.userId, userId)).returning();
  sendSuccess(res, 'Module completed', { path: updated });
});

// POST /api/me/learning-path/reset
const resetPathProgress = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const [row] = await db.select().from(learningPaths).where(eq(learningPaths.userId, userId)).limit(1);
  if (!row) return sendError(res, HTTP_STATUS.NOT_FOUND, 'No learning path found');

  const progress = resetProgress(row.stages);
  const [updated] = await db.update(learningPaths).set(touch(progress)).where(eq(learningPaths.userId, userId)).returning();
  sendSuccess(res, 'Progress reset', { path: updated });
});

module.exports = {
  getPath,
  generatePath,
  startModuleHandler,
  completeModuleHandler,
  resetPathProgress,
};
