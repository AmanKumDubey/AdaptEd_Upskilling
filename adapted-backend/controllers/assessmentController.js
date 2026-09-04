const { eq, and, inArray, desc, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { assessmentQuestions, assessmentSessions, assessmentResults } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

const QUESTIONS_PER_ATTEMPT = 20;

// Mirrors pathwise-app-v5/src/features/assessment/assessmentEngine.js exactly -
// this is the server-side home of logic that, until now, only ever ran in
// the browser (with the answer key sitting right there in the page's JSON).
const RECOMMENDED_ROLES = {
  tech: ['AI Engineer', 'Machine Learning Engineer', 'MLOps Engineer'],
  data: ['Data Scientist', 'Applied Scientist', 'Analytics Lead'],
  nontech: ['AI-enabled Business Professional', 'Business Analyst', 'AI Product Specialist'],
  manager: ['AI Program Manager', 'Head of AI', 'Digital Transformation Lead'],
};

const getProficiencyLevel = (score) => {
  if (score >= 80) return 'Advanced';
  if (score >= 60) return 'Intermediate';
  if (score >= 40) return 'Developing';
  return 'Beginner';
};

// Safe view of a question while an attempt is in progress - correctIndex and
// explanation are withheld so they never appear in a network response the
// user could inspect mid-attempt (the old fully-client-side version bundled
// the whole answer key into the page's own JSON; this closes that gap).
const toSafeQuestion = (q) => ({ id: q.id, domain: q.domain, questionText: q.questionText, options: q.options });

const loadQuestionsInOrder = async (ids) => {
  const rows = await db.select().from(assessmentQuestions).where(inArray(assessmentQuestions.id, ids));
  const byId = new Map(rows.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

const scoreSession = (personaId, questions, answers) => {
  const review = questions.map((q) => {
    const selectedIndex = answers[q.id] ?? null;
    return {
      questionId: q.id,
      question: q.questionText,
      domain: q.domain,
      selectedIndex,
      selectedAnswer: selectedIndex !== null ? q.options[selectedIndex] : 'Not answered',
      correctIndex: q.correctIndex,
      correctAnswer: q.options[q.correctIndex],
      isCorrect: selectedIndex === q.correctIndex,
      explanation: q.explanation,
    };
  });

  const correctCount = review.filter((a) => a.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);

  const domainGroups = review.reduce((groups, a) => {
    const current = groups[a.domain] || { correct: 0, total: 0 };
    current.total += 1;
    if (a.isCorrect) current.correct += 1;
    groups[a.domain] = current;
    return groups;
  }, {});

  const domainScores = Object.entries(domainGroups)
    .map(([domain, v]) => ({ domain, correct: v.correct, total: v.total, score: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => b.score - a.score);

  const strengths = domainScores.filter((d) => d.score >= 70).map((d) => d.domain);
  const gaps = domainScores.filter((d) => d.score < 60).map((d) => d.domain);

  return {
    score,
    correctCount,
    total: questions.length,
    level: getProficiencyLevel(score),
    domainScores,
    strengths: strengths.length ? strengths : [domainScores[0]?.domain].filter(Boolean),
    gaps: gaps.length ? gaps : ['No priority gaps detected'],
    recommendedRoles: RECOMMENDED_ROLES[personaId],
    review,
  };
};

// POST /api/me/assessment/sessions  { personaId }
// Draws a fresh random 20-question sample server-side (Postgres ORDER BY
// random()) - the client never sees the full 100-question pool for a persona.
const startSession = asyncHandler(async (req, res) => {
  const { personaId } = req.body;
  const userId = req.user.userId;

  const sampled = await db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.personaId, personaId))
    .orderBy(sql`random()`)
    .limit(QUESTIONS_PER_ATTEMPT);

  if (sampled.length < QUESTIONS_PER_ATTEMPT) {
    return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Question bank is not fully seeded for this persona');
  }

  const now = new Date();
  const [session] = await db.insert(assessmentSessions).values(withTimestamps({
    id: newId(),
    userId,
    personaId,
    questionIds: sampled.map((q) => q.id),
    answers: {},
    currentQuestion: 0,
    status: 'in_progress',
    startedAt: now,
  })).returning();

  sendSuccess(res, 'Assessment started', {
    session: { ...session, questions: sampled.map(toSafeQuestion) },
  }, HTTP_STATUS.CREATED);
});

// GET /api/me/assessment/sessions/active - for resuming an in-progress
// attempt (the old localStorage session played this same role).
const getActiveSession = asyncHandler(async (req, res) => {
  const [session] = await db
    .select()
    .from(assessmentSessions)
    .where(and(eq(assessmentSessions.userId, req.user.userId), eq(assessmentSessions.status, 'in_progress')))
    .orderBy(desc(assessmentSessions.startedAt))
    .limit(1);

  if (!session) {
    return sendSuccess(res, 'No active session', { session: null });
  }

  const questions = await loadQuestionsInOrder(session.questionIds);
  sendSuccess(res, 'Active session retrieved', { session: { ...session, questions: questions.map(toSafeQuestion) } });
});

// PUT /api/me/assessment/sessions/:sessionId/answer  { questionId, selectedIndex, currentQuestion? }
const answerQuestion = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { questionId, selectedIndex, currentQuestion } = req.body;

  const [session] = await db.select().from(assessmentSessions)
    .where(and(eq(assessmentSessions.id, sessionId), eq(assessmentSessions.userId, req.user.userId)))
    .limit(1);

  if (!session) return sendError(res, HTTP_STATUS.NOT_FOUND, 'Session not found');
  if (session.status !== 'in_progress') return sendError(res, HTTP_STATUS.CONFLICT, 'This attempt is no longer in progress');
  if (!session.questionIds.includes(questionId)) return sendError(res, HTTP_STATUS.BAD_REQUEST, 'That question is not part of this attempt');

  const updatedAnswers = { ...session.answers, [questionId]: selectedIndex };
  const updateData = { answers: updatedAnswers };
  if (currentQuestion !== undefined) updateData.currentQuestion = currentQuestion;

  const [updated] = await db.update(assessmentSessions).set(touch(updateData))
    .where(eq(assessmentSessions.id, sessionId)).returning();

  sendSuccess(res, 'Answer saved', { session: updated });
});

// POST /api/me/assessment/sessions/:sessionId/complete
// Scores the attempt, persists the summary to AssessmentResults, and - only
// now that the attempt is over - returns the full per-question review
// (correct answers + explanations).
const completeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;

  const [session] = await db.select().from(assessmentSessions)
    .where(and(eq(assessmentSessions.id, sessionId), eq(assessmentSessions.userId, userId)))
    .limit(1);

  if (!session) return sendError(res, HTTP_STATUS.NOT_FOUND, 'Session not found');
  if (session.status === 'completed') return sendError(res, HTTP_STATUS.CONFLICT, 'This attempt was already completed');

  const questions = await loadQuestionsInOrder(session.questionIds);
  const scored = scoreSession(session.personaId, questions, session.answers);
  const completedAt = new Date();

  const [result] = await db.insert(assessmentResults).values(withTimestamps({
    id: newId(),
    sessionId: session.id,
    userId,
    personaId: session.personaId,
    score: scored.score,
    correctCount: scored.correctCount,
    total: scored.total,
    level: scored.level,
    domainScores: scored.domainScores,
    strengths: scored.strengths,
    gaps: scored.gaps,
    recommendedRoles: scored.recommendedRoles,
    completedAt,
  })).returning();

  await db.update(assessmentSessions).set(touch({ status: 'completed', completedAt }))
    .where(eq(assessmentSessions.id, sessionId));

  sendSuccess(res, 'Assessment completed', { result: { ...result, answers: scored.review } });
});

// GET /api/me/assessment/results - history list (no per-question review).
const listResults = asyncHandler(async (req, res) => {
  const rows = await db.select().from(assessmentResults)
    .where(eq(assessmentResults.userId, req.user.userId))
    .orderBy(desc(assessmentResults.completedAt));

  sendSuccess(res, 'Assessment results retrieved', { results: rows });
});

// GET /api/me/assessment/results/latest - convenience for Skills Wallet /
// Learning Path generation, which only need the most recent domainScores.
const getLatestResult = asyncHandler(async (req, res) => {
  const [result] = await db.select().from(assessmentResults)
    .where(eq(assessmentResults.userId, req.user.userId))
    .orderBy(desc(assessmentResults.completedAt))
    .limit(1);

  sendSuccess(res, 'Latest assessment result retrieved', { result: result || null });
});

// GET /api/me/assessment/results/:resultId - full detail, review recomputed
// on demand from the linked session + questions rather than stored twice.
const getResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const [result] = await db.select().from(assessmentResults)
    .where(and(eq(assessmentResults.id, resultId), eq(assessmentResults.userId, req.user.userId)))
    .limit(1);

  if (!result) return sendError(res, HTTP_STATUS.NOT_FOUND, 'Result not found');

  const [session] = await db.select().from(assessmentSessions).where(eq(assessmentSessions.id, result.sessionId)).limit(1);
  const questions = await loadQuestionsInOrder(session.questionIds);
  const scored = scoreSession(result.personaId, questions, session.answers);

  sendSuccess(res, 'Assessment result retrieved', { result: { ...result, answers: scored.review } });
});

module.exports = {
  startSession,
  getActiveSession,
  answerQuestion,
  completeSession,
  listResults,
  getLatestResult,
  getResult,
};
