// Phase B9: real Postgres, real HTTP against a real spawned server process
// (see globalSetup.js) - relies on AssessmentQuestions already being seeded,
// since generating a path needs a completed assessment first.
const request = require('supertest');
const { eq } = require('drizzle-orm');
const { BASE_URL } = require('./testServerConfig');
const { db, pool } = require('../../db/client');
const {
  users, authUser, authAccount, authSession,
  assessmentSessions, assessmentResults, learningPaths,
} = require('../../db/schema');

const app = BASE_URL;

async function completeAnAssessment(token) {
  const startRes = await request(app)
    .post('/api/me/assessment/sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ personaId: 'tech' });
  const { id: sessionId, questions } = startRes.body.data.session;

  for (const question of questions) {
    await request(app)
      .put(`/api/me/assessment/sessions/${sessionId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: question.id, selectedIndex: 1 });
  }

  return request(app)
    .post(`/api/me/assessment/sessions/${sessionId}/complete`)
    .set('Authorization', `Bearer ${token}`);
}

describe('learning path integration (generate -> start -> complete -> reset)', () => {
  const suffix = Date.now();
  const email = `integration-learningpath-${suffix}@example.com`;
  const password = 'Integration123!';
  let userId;
  let token;

  afterAll(async () => {
    if (userId) {
      await db.delete(learningPaths).where(eq(learningPaths.userId, userId));
      await db.delete(assessmentResults).where(eq(assessmentResults.userId, userId));
      await db.delete(assessmentSessions).where(eq(assessmentSessions.userId, userId));
      await db.delete(authSession).where(eq(authSession.userId, userId));
      await db.delete(authAccount).where(eq(authAccount.userId, userId));
      await db.delete(authUser).where(eq(authUser.id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    await pool.end();
  });

  test('register a user to run the flow as', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password });
    expect(res.status).toBe(201);
    userId = res.body.data.user.id;
    token = res.body.data.token;
  });

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/api/me/learning-path');
    expect(res.status).toBe(401);
  });

  test('no path exists yet', async () => {
    const res = await request(app).get('/api/me/learning-path').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.path).toBeNull();
  });

  test('generating a path before any assessment is rejected', async () => {
    const res = await request(app)
      .post('/api/me/learning-path/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'ML Engineer', hoursPerWeek: 10 });
    expect(res.status).toBe(400);
  });

  let firstModuleId;

  test('generating a path after a completed assessment works', async () => {
    const assessment = await completeAnAssessment(token);
    expect(assessment.status).toBe(200);

    const res = await request(app)
      .post('/api/me/learning-path/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetRole: 'ML Engineer', hoursPerWeek: 10,
        learningFormats: ['Project-based'], learningPace: 'Steady', sourceFingerprint: 'fp-1',
      });

    expect(res.status).toBe(201);
    const { path } = res.body.data;
    expect(path.targetRole).toBe('ML Engineer');
    expect(path.currentLevel).toBe(assessment.body.data.result.level);
    expect(Array.isArray(path.stages)).toBe(true);
    expect(path.stages.length).toBeGreaterThan(0);
    expect(path.completedModuleIds).toEqual([]);
    expect(path.currentModuleId).toEqual(expect.any(String));

    firstModuleId = path.currentModuleId;
  });

  test('completing a locked module (not the current one, no prerequisites met) is rejected', async () => {
    const pathRes = await request(app).get('/api/me/learning-path').set('Authorization', `Bearer ${token}`);
    const allModules = pathRes.body.data.path.stages.flatMap((s) => s.modules);
    const lockedModule = allModules.find((m) => m.id !== firstModuleId && m.prerequisites.length > 0);

    const res = await request(app)
      .put(`/api/me/learning-path/modules/${lockedModule.id}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('completing the current module unlocks the next one', async () => {
    const res = await request(app)
      .put(`/api/me/learning-path/modules/${firstModuleId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.path.completedModuleIds).toContain(firstModuleId);
    expect(res.body.data.path.currentModuleId).not.toBe(firstModuleId);
  });

  test('resetting clears progress back to the first module', async () => {
    const res = await request(app).post('/api/me/learning-path/reset').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.path.completedModuleIds).toEqual([]);
    expect(res.body.data.path.currentModuleId).toBe(firstModuleId);
  });

  test('regenerating replaces the path rather than creating a second row', async () => {
    const res = await request(app)
      .post('/api/me/learning-path/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'AI Engineer', hoursPerWeek: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.path.targetRole).toBe('AI Engineer');

    const rows = await db.select().from(learningPaths).where(eq(learningPaths.userId, userId));
    expect(rows).toHaveLength(1);
  });

  test("another user cannot see or mutate this user's path", async () => {
    const otherEmail = `integration-learningpath-other-${suffix}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({ email: otherEmail, password });
    const otherToken = registerRes.body.data.token;
    const otherUserId = registerRes.body.data.user.id;

    const getRes = await request(app).get('/api/me/learning-path').set('Authorization', `Bearer ${otherToken}`);
    expect(getRes.body.data.path).toBeNull();

    const completeRes = await request(app)
      .put(`/api/me/learning-path/modules/${firstModuleId}/complete`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(completeRes.status).toBe(404);

    await db.delete(authSession).where(eq(authSession.userId, otherUserId));
    await db.delete(authAccount).where(eq(authAccount.userId, otherUserId));
    await db.delete(authUser).where(eq(authUser.id, otherUserId));
    await db.delete(users).where(eq(users.id, otherUserId));
  });
});
