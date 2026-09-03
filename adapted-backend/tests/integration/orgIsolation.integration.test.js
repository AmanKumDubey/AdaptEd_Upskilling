// Phase B6: the "two-org isolation" gate from the B5 plan, formalized as a
// real integration test - real Postgres, real HTTP against a real spawned
// server process (see globalSetup.js), no mocks. Complements
// tests/tenant.test.js (mocked unit coverage) and scripts/verifyOrgIsolation.js
// (the original one-off live verification).
const request = require('supertest');
const { eq, inArray } = require('drizzle-orm');
const { BASE_URL } = require('./testServerConfig');
const { db, pool } = require('../../db/client');
const { users, authUser, authAccount, authSession, organizations, orgMembers, invitations } = require('../../db/schema');

const app = BASE_URL;

describe('organization tenant isolation (real DB, real HTTP)', () => {
  const suffix = Date.now();
  const password = 'Integration123!';
  const emailA = `integration-org-a-${suffix}@example.com`;
  const emailB = `integration-org-b-${suffix}@example.com`;
  const emailInvitee = `integration-org-invitee-${suffix}@example.com`;

  const userIds = [];
  let orgId;
  let tokenA;
  let tokenB;

  const register = async (email) => {
    const res = await request(app).post('/api/auth/register').send({ email, password });
    userIds.push(res.body.data.user.id);
    return res.body.data.token;
  };

  beforeAll(async () => {
    tokenA = await register(emailA);
    tokenB = await register(emailB);
  });

  afterAll(async () => {
    if (orgId) {
      await db.delete(invitations).where(eq(invitations.orgId, orgId));
      await db.delete(orgMembers).where(eq(orgMembers.orgId, orgId));
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
    if (userIds.length) {
      await db.delete(authSession).where(inArray(authSession.userId, userIds));
      await db.delete(authAccount).where(inArray(authAccount.userId, userIds));
      await db.delete(authUser).where(inArray(authUser.id, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    await pool.end();
  });

  test('userA creates an organization and becomes its owner', async () => {
    const res = await request(app)
      .post('/api/orgs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: `Integration Org ${suffix}` });

    expect(res.status).toBe(201);
    orgId = res.body.data.organization.id;
  });

  test('userA (owner) can read their own organization', async () => {
    const res = await request(app).get(`/api/orgs/${orgId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('owner');
  });

  test('userB, with a fully valid session but no membership, is refused with 403', async () => {
    const res = await request(app).get(`/api/orgs/${orgId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  test('userB cannot list userA\'s org members either', async () => {
    const res = await request(app).get(`/api/orgs/${orgId}/members`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  test('userB cannot create a department in userA\'s org', async () => {
    const res = await request(app)
      .post(`/api/orgs/${orgId}/departments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Should not be created' });
    expect(res.status).toBe(403);
  });

  test('an org id the caller has no membership in returns 403, not 404 - no existence leak', async () => {
    const res = await request(app)
      .get('/api/orgs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });

  test('invite -> accept -> membership works end to end over real HTTP', async () => {
    const inviteRes = await request(app)
      .post(`/api/orgs/${orgId}/invitations`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: emailInvitee, role: 'hr' });

    expect(inviteRes.status).toBe(201);
    const token = inviteRes.body.data.invitation.token;

    const tokenInvitee = await register(emailInvitee);

    const acceptRes = await request(app)
      .post('/api/invitations/accept')
      .set('Authorization', `Bearer ${tokenInvitee}`)
      .send({ token });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.membership.role).toBe('hr');

    const memberViewRes = await request(app).get(`/api/orgs/${orgId}`).set('Authorization', `Bearer ${tokenInvitee}`);
    expect(memberViewRes.status).toBe(200);
    expect(memberViewRes.body.data.role).toBe('hr');
  });
});
