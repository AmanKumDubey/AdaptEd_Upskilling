require('dotenv').config({ path: '.env' });

// Phase B5: one-off live verification against the real local Postgres,
// matching how B4's better-auth wiring was verified (backfill/live scripts,
// not just mocked Jest) rather than assumed from the mocked unit tests alone.
// Creates two throwaway orgs + two throwaway users, proves cross-org access
// is refused, runs the invite -> accept -> membership flow end to end, then
// deletes everything it created.
const { eq, and } = require('drizzle-orm');
const { db, pool } = require('../db/client');
const { users, organizations, orgMembers, invitations } = require('../db/schema');
const { newId, withTimestamps } = require('../db/helpers');
const { hashPassword, randomString } = require('../utilities/helpers/helper');
const { requireOrgMembership, requireOrgRole } = require('../middleware/tenant');
const { acceptInvitation } = require('../controllers/invitationController');

const fakeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

// asyncHandler (utilities/helpers/helper.js) wraps every handler as
// `(req, res, next) => { Promise.resolve(fn(...)).catch(next); }` - it does
// NOT return that promise, so a bare `await handler(...)` resolves before the
// real DB work finishes. This resolves once the handler actually reaches
// either next() or res.json(), whichever comes first - so assertions run
// against the real outcome, not a race.
const invoke = (handler, req) => new Promise((resolve, reject) => {
  const res = fakeRes();
  let settled = false;

  const origJson = res.json;
  res.json = (body) => {
    origJson(body);
    if (!settled) { settled = true; resolve({ res, nextCalled: false }); }
    return res;
  };

  const next = (err) => {
    if (settled) return;
    settled = true;
    if (err) return reject(err);
    resolve({ res, nextCalled: true });
  };

  handler(req, res, next);
});

const assert = (condition, message) => {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`  ok - ${message}`);
};

const run = async () => {
  const suffix = Date.now();
  const cleanup = { userIds: [], orgIds: [] };

  try {
    // --- setup: two orgs, two users, one member of each ---
    const [orgA] = await db.insert(organizations).values(withTimestamps({
      id: newId(), name: `Verify Org A ${suffix}`, slug: `verify-org-a-${suffix}`,
    })).returning();
    const [orgB] = await db.insert(organizations).values(withTimestamps({
      id: newId(), name: `Verify Org B ${suffix}`, slug: `verify-org-b-${suffix}`,
    })).returning();
    cleanup.orgIds.push(orgA.id, orgB.id);

    const hashedPassword = await hashPassword('Verify123!');
    const [userA] = await db.insert(users).values(withTimestamps({
      id: newId(), username: `verify-a-${suffix}`, email: `verify-a-${suffix}@example.com`,
      password: hashedPassword, goals: [], interests: [],
    })).returning();
    const [userB] = await db.insert(users).values(withTimestamps({
      id: newId(), username: `verify-b-${suffix}`, email: `verify-b-${suffix}@example.com`,
      password: hashedPassword, goals: [], interests: [],
    })).returning();
    cleanup.userIds.push(userA.id, userB.id);

    await db.insert(orgMembers).values(withTimestamps({
      id: newId(), orgId: orgA.id, userId: userA.id, departmentId: null, role: 'owner',
    }));
    await db.insert(orgMembers).values(withTimestamps({
      id: newId(), orgId: orgB.id, userId: userB.id, departmentId: null, role: 'owner',
    }));

    console.log('\n1. Cross-org isolation (requireOrgMembership)');

    // userA (owner of Org A) hits Org A - allowed
    let req = { params: { orgId: orgA.id }, user: { userId: userA.id } };
    let outcome = await invoke(requireOrgMembership, req);
    assert(outcome.nextCalled === true, 'userA can access Org A (own org)');
    assert(req.orgMember && req.orgMember.role === 'owner', 'userA resolves as owner of Org A');

    // userA (owner of Org A, NOT a member of Org B) hits Org B - refused,
    // even though the session/token is fully valid.
    req = { params: { orgId: orgB.id }, user: { userId: userA.id } };
    outcome = await invoke(requireOrgMembership, req);
    assert(outcome.nextCalled === false, 'userA is REFUSED access to Org B');
    assert(outcome.res.statusCode === 403, 'refusal is a 403, not a silent empty result');

    // Symmetric check: userB cannot see Org A either.
    req = { params: { orgId: orgA.id }, user: { userId: userB.id } };
    outcome = await invoke(requireOrgMembership, req);
    assert(outcome.nextCalled === false, 'userB is REFUSED access to Org A (symmetric check)');

    console.log('\n2. Role gate (requireOrgRole)');
    let roleNext = false;
    requireOrgRole('owner', 'admin')({ orgMember: { role: 'owner' } }, fakeRes(), () => { roleNext = true; });
    assert(roleNext === true, 'owner passes an owner/admin gate');

    roleNext = false;
    const roleRes = fakeRes();
    requireOrgRole('owner', 'admin')({ orgMember: { role: 'member' } }, roleRes, () => { roleNext = true; });
    assert(roleNext === false && roleRes.statusCode === 403, 'plain member is blocked by an owner/admin gate');

    console.log('\n3. Invitation flow end-to-end (invite -> accept -> membership)');

    // userA (owner of Org A) invites a brand-new user's email into Org A.
    const inviteeEmail = `verify-invitee-${suffix}@example.com`;
    const token = randomString(24);
    const [invitation] = await db.insert(invitations).values(withTimestamps({
      id: newId(), orgId: orgA.id, departmentId: null, email: inviteeEmail, role: 'hr',
      token, invitedBy: userA.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null, revokedAt: null,
    })).returning();
    assert(!!invitation.id, 'invitation row created');

    const [invitee] = await db.insert(users).values(withTimestamps({
      id: newId(), username: `verify-invitee-${suffix}`, email: inviteeEmail,
      password: hashedPassword, goals: [], interests: [],
    })).returning();
    cleanup.userIds.push(invitee.id);

    // Wrong-email guard first, while the invitation is still pending: someone
    // else cannot accept an invitation addressed to a different email, even
    // with a valid token. (Must run before the legitimate accept below - once
    // accepted, the "already used" check would mask this as a 400 instead.)
    const wrongAcceptReq = { body: { token }, user: { userId: userB.id } };
    const wrongAcceptOutcome = await invoke(acceptInvitation, wrongAcceptReq);
    assert(wrongAcceptOutcome.res.statusCode === 403, 'accept by the wrong user (email mismatch) is rejected with 403');

    const [stillPending] = await db.select().from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgA.id), eq(orgMembers.userId, userB.id))).limit(1);
    assert(!stillPending, 'the wrong-email attempt did NOT create a membership row');

    // Invitee accepts using their own session - this is the real controller,
    // not a re-implementation of its logic.
    const acceptReq = { body: { token }, user: { userId: invitee.id } };
    const acceptOutcome = await invoke(acceptInvitation, acceptReq);
    assert(acceptOutcome.res.statusCode === 200 || acceptOutcome.res.statusCode === null, 'accept returned success');

    const [newMembership] = await db.select().from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgA.id), eq(orgMembers.userId, invitee.id))).limit(1);
    assert(!!newMembership, 'invitee now has an OrgMembers row in Org A');
    assert(newMembership.role === 'hr', 'invitee got the role specified on the invitation (hr)');

    const [acceptedInvitation] = await db.select().from(invitations).where(eq(invitations.id, invitation.id)).limit(1);
    assert(!!acceptedInvitation.acceptedAt, 'invitation is marked accepted');

    // Re-accepting an already-used invitation is refused too.
    const reAcceptOutcome = await invoke(acceptInvitation, { body: { token }, user: { userId: invitee.id } });
    assert(reAcceptOutcome.res.statusCode === 400, 're-accepting an already-used invitation is rejected with 400');

    console.log('\nAll checks passed.\n');
  } finally {
    // --- cleanup: leave the database exactly as it was ---
    for (const orgId of cleanup.orgIds) {
      await db.delete(invitations).where(eq(invitations.orgId, orgId));
      await db.delete(orgMembers).where(eq(orgMembers.orgId, orgId));
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
    for (const userId of cleanup.userIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    console.log('Cleanup complete - all verification rows removed.');
  }
};

run()
  .catch((error) => {
    console.error('\nVerification FAILED:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
