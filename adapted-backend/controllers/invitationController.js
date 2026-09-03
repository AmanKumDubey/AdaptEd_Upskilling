const { eq, and, isNull, gt } = require('drizzle-orm');
const { db } = require('../db/client');
const { organizations, invitations, orgMembers, users } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler, randomString } = require('../utilities/helpers/helper');
const { sendEmail } = require('../utilities/helpers/email');
const { HTTP_STATUS } = require('../utilities/constants');

const INVITATION_TTL_DAYS = 7;

const expiresInDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// POST /api/orgs/:orgId/invitations
const createInvitation = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { email, role, departmentId } = req.body;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Organization not found');
  }

  const token = randomString(24);

  const [invitation] = await db.insert(invitations).values(withTimestamps({
    id: newId(),
    orgId,
    departmentId: departmentId || null,
    email,
    role,
    token,
    invitedBy: req.user.userId,
    expiresAt: expiresInDays(INVITATION_TTL_DAYS),
    acceptedAt: null,
    revokedAt: null,
  })).returning();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const acceptUrl = `${frontendUrl}/invitations/accept?token=${token}`;
  const subject = `You've been invited to join ${org.name} on AdaptED`;
  const text = `You've been invited to join ${org.name} as ${role}. Accept your invitation: ${acceptUrl}`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <h2>You're invited to join ${org.name}</h2>
    <p>Role: <strong>${role}</strong></p>
    <p><a href="${acceptUrl}">Accept invitation</a> (expires in ${INVITATION_TTL_DAYS} days)</p>
  </div>`;

  try {
    await sendEmail({ to: email, subject, text, html });
  } catch (error) {
    console.error('[Invitation] sendEmail failed:', error.message);
  }

  sendSuccess(res, 'Invitation sent successfully', { invitation }, HTTP_STATUS.CREATED);
});

// GET /api/orgs/:orgId/invitations - pending only
const listInvitations = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const rows = await db
    .select()
    .from(invitations)
    .where(and(
      eq(invitations.orgId, orgId),
      isNull(invitations.acceptedAt),
      isNull(invitations.revokedAt),
      gt(invitations.expiresAt, new Date()),
    ));

  sendSuccess(res, 'Invitations retrieved successfully', rows);
});

// DELETE /api/orgs/:orgId/invitations/:invitationId
const revokeInvitation = asyncHandler(async (req, res) => {
  const { orgId, invitationId } = req.params;

  const [invitation] = await db.select().from(invitations).where(and(eq(invitations.id, invitationId), eq(invitations.orgId, orgId))).limit(1);
  if (!invitation) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Invitation not found in this organization');
  }

  if (invitation.acceptedAt) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'This invitation has already been accepted');
  }

  await db.update(invitations).set(touch({ revokedAt: new Date() })).where(eq(invitations.id, invitationId));
  sendSuccess(res, 'Invitation revoked successfully');
});

// POST /api/invitations/accept - not org-scoped (the caller isn't a member
// yet); the token itself, plus an email match against the authenticated
// user's own account, is what proves the caller is the intended recipient.
const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.userId;

  const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
  if (!invitation) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid invitation token');
  }

  if (invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'This invitation is no longer valid');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'This invitation was sent to a different email address');
  }

  const [existingMembership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, invitation.orgId), eq(orgMembers.userId, userId)))
    .limit(1);

  let membership = existingMembership;
  if (!membership) {
    [membership] = await db.insert(orgMembers).values(withTimestamps({
      id: newId(),
      orgId: invitation.orgId,
      userId,
      departmentId: invitation.departmentId,
      role: invitation.role,
    })).returning();
  }

  await db.update(invitations).set(touch({ acceptedAt: new Date() })).where(eq(invitations.id, invitation.id));

  sendSuccess(res, 'Invitation accepted successfully', { membership });
});

module.exports = {
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
};
