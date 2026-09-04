// Phase B8: real Postgres, real HTTP against a real spawned server process
// (see globalSetup.js) - relies on AssessmentQuestions already being seeded
// (scripts/seedAssessmentQuestions.ts) against whichever DB this points at.
const request = require('supertest');
const { eq } = require('drizzle-orm');
const { BASE_URL } = require('./testServerConfig');
const { db, pool } = require('../../db/client');
const { users, authUser, authAccount, authSession, assessmentSessions, assessmentResults } = require('../../db/schema');

const app = BASE_URL;

describe('assessment integration (start -> answer -> complete -> results)', () => {
  const suffix = Date.now();
  const email = `integration-assessment-${suffix}@example.com`;
  const password = 'Integration123!';
  let userId;
  let token;

  afterAll(async () => {
    if (userId) {
      await db.delete(assessmentResults).where(eq(assessmentResults.userId, userId));
      await db.delete(assessmentSessions).where(eq(assessmentSessions.userId, userId));
      await db.delete(authSession).where(eq(authSession.userId, userId));
      await db.delete(authAccount).where(eq(authAccount.userId, userId));
      await db.delete(authUser).where(eq(authUser.id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    await pool.end();
  });

  test('register a user to run the attempt as', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password });
    expect(res.status).toBe(201);
    userId = res.body.data.user.id;
    token = res.body.data.token;
  });

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).post('/api/me/assessment/sessions').send({ personaId: 'tech' });
    expect(res.status).toBe(401);
  });

  test('starting a session draws exactly 20 questions, none carrying the answer key', async () => {
    const res = await request(app)
      .post('/api/me/assessment/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ personaId: 'tech' });

    expect(res.status).toBe(201);
    expect(res.body.data.session.questions).toHaveLength(20);
    expect(res.body.data.session.questions[0]).not.toHaveProperty('correctIndex');
    expect(res.body.data.session.questions[0]).not.toHaveProperty('explanation');
  });

  let sessionId;
  let questionIds;

  test('the active session can be fetched (resume support)', async () => {
    const res = await request(app)
      .get('/api/me/assessment/sessions/active')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.session).not.toBeNull();
    sessionId = res.body.data.session.id;
    questionIds = res.body.data.session.questionIds;
  });

  test('answering a question outside this attempt is rejected', async () => {
    const res = await request(app)
      .put(`/api/me/assessment/sessions/${sessionId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: '00000000-0000-0000-0000-000000000000', selectedIndex: 0 });

    expect(res.status).toBe(400);
  });

  test('every question can be answered', async () => {
    for (const questionId of questionIds) {
      const res = await request(app)
        .put(`/api/me/assessment/sessions/${sessionId}/answer`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, selectedIndex: 1 });
      expect(res.status).toBe(200);
    }
  });

  let latestResultId;

  test('completing the session scores it and reveals the answer key', async () => {
    const res = await request(app)
      .post(`/api/me/assessment/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { result } = res.body.data;
    expect(result.total).toBe(20);
    expect(result.correctCount + (result.total - result.correctCount)).toBe(20);
    expect(result.score).toBe(Math.round((result.correctCount / result.total) * 100));
    expect(Array.isArray(result.domainScores)).toBe(true);
    expect(result.answers).toHaveLength(20);
    expect(result.answers[0]).toHaveProperty('correctIndex');
    expect(result.answers[0]).toHaveProperty('explanation');

    latestResultId = result.id;
  });

  test('completing the same session twice is rejected', async () => {
    const res = await request(app)
      .post(`/api/me/assessment/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  test('no active session remains after completion', async () => {
    const res = await request(app)
      .get('/api/me/assessment/sessions/active')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session).toBeNull();
  });

  test('the result shows up in history and as latest', async () => {
    const list = await request(app).get('/api/me/assessment/results').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.results.map((r) => r.id)).toContain(latestResultId);

    const latest = await request(app).get('/api/me/assessment/results/latest').set('Authorization', `Bearer ${token}`);
    expect(latest.status).toBe(200);
    expect(latest.body.data.result.id).toBe(latestResultId);
  });

  test('a single result can be fetched with its full review', async () => {
    const res = await request(app)
      .get(`/api/me/assessment/results/${latestResultId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.result.answers).toHaveLength(20);
  });

  test("another user cannot fetch someone else's result", async () => {
    const otherEmail = `integration-assessment-other-${suffix}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({ email: otherEmail, password });
    const otherToken = registerRes.body.data.token;
    const otherUserId = registerRes.body.data.user.id;

    const res = await request(app)
      .get(`/api/me/assessment/results/${latestResultId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);

    await db.delete(authSession).where(eq(authSession.userId, otherUserId));
    await db.delete(authAccount).where(eq(authAccount.userId, otherUserId));
    await db.delete(authUser).where(eq(authUser.id, otherUserId));
    await db.delete(users).where(eq(users.id, otherUserId));
  });
});
