// Phase B6: real Postgres, real HTTP against a real spawned server process
// (see globalSetup.js for why it's a child process rather than an in-process
// require) - no mocks. Run with `npm run test:integration` against a database
// that has migrations applied.
const request = require('supertest');
const { eq } = require('drizzle-orm');
const { BASE_URL } = require('./testServerConfig');
const { db, pool } = require('../../db/client');
const { users, authUser, authAccount, authSession } = require('../../db/schema');

const app = BASE_URL;

describe('auth integration (register -> login -> profile -> logout)', () => {
  const suffix = Date.now();
  const email = `integration-auth-${suffix}@example.com`;
  const password = 'Integration123!';
  let userId;
  let token;

  afterAll(async () => {
    if (userId) {
      await db.delete(authSession).where(eq(authSession.userId, userId));
      await db.delete(authAccount).where(eq(authAccount.userId, userId));
      await db.delete(authUser).where(eq(authUser.id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    await pool.end();
  });

  test('register creates a user, returns a token, and never leaks the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.password).toBeUndefined();

    userId = res.body.data.user.id;
  });

  test('registering the same email again is rejected as a conflict', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password });
    expect(res.status).toBe(409);
  });

  test('login with the correct password succeeds', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    token = res.body.data.token;
  });

  test('login with the wrong password is rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  test('profile is retrievable with a valid session token', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(userId);
  });

  test('profile is rejected with no token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  test('logout revokes the session - the same token is rejected immediately after', async () => {
    const logoutRes = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(afterLogout.status).toBe(401);
  });
});
