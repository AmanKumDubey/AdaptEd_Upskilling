const { eq, and } = require('drizzle-orm');
const { db } = require('../db/client');
const { orgMembers, skillVerifications } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

// POST /api/orgs/:orgId/members/:memberId/skill-verifications
// Replaces Skills Wallet's old "verified" heuristic (score >= 70 or
// courseCount >= 2) with a real, attributable verification an owner/admin/hr
// can grant. Upserts on the (userId, skillName) unique constraint so
// re-verifying just updates who verified it and when.
const verifySkill = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;
  const { skillName } = req.body;

  const [member] = await db.select({ userId: orgMembers.userId }).from(orgMembers)
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Member not found in this organization');
  }

  const [verification] = await db
    .insert(skillVerifications)
    .values(withTimestamps({ id: newId(), userId: member.userId, orgId, skillName, verifiedBy: req.user.userId }))
    .onConflictDoUpdate({
      target: [skillVerifications.userId, skillVerifications.skillName],
      set: touch({ verifiedBy: req.user.userId, orgId }),
    })
    .returning();

  sendSuccess(res, 'Skill verified successfully', { verification });
});

// DELETE /api/orgs/:orgId/members/:memberId/skill-verifications/:skillName
const unverifySkill = asyncHandler(async (req, res) => {
  const { orgId, memberId, skillName } = req.params;

  const [member] = await db.select({ userId: orgMembers.userId }).from(orgMembers)
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Member not found in this organization');
  }

  await db.delete(skillVerifications)
    .where(and(eq(skillVerifications.userId, member.userId), eq(skillVerifications.skillName, skillName)));
  sendSuccess(res, 'Skill verification removed successfully');
});

// GET /api/me/skill-verifications -> [{ skillName, verifiedBy, orgId, createdAt }]
const listMySkillVerifications = asyncHandler(async (req, res) => {
  const rows = await db.select().from(skillVerifications).where(eq(skillVerifications.userId, req.user.userId));
  sendSuccess(res, 'Skill verifications retrieved successfully', rows);
});

// GET /api/orgs/:orgId/members/:memberId/skill-verifications -> [{ skillName, verifiedBy, createdAt }]
// So EmployerTeamView can show which of a member's skills are already
// verified before an owner/admin/hr verifies another.
const listMemberSkillVerifications = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;

  const [member] = await db.select({ userId: orgMembers.userId }).from(orgMembers)
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Member not found in this organization');
  }

  const rows = await db.select().from(skillVerifications).where(eq(skillVerifications.userId, member.userId));
  sendSuccess(res, 'Skill verifications retrieved successfully', rows);
});

module.exports = { verifySkill, unverifySkill, listMySkillVerifications, listMemberSkillVerifications };
