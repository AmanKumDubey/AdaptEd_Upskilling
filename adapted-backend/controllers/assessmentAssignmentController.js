const { eq, and, inArray, desc, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { assessmentAssignments, assessmentResults, orgMembers, users, organizations, notifications } = require('../db/schema');
const { newId, withTimestamps } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler } = require('../utilities/helpers/helper');
const { createNotification } = require('../services/notificationService');
const { HTTP_STATUS } = require('../utilities/constants');

// Mirrors pathwise-app-v5/src/SkillsAssessment.jsx's PERSONAS titles - kept
// in sync by hand since this is the only server-side spot that needs a
// human-readable label (notification text); everywhere else just passes
// personaId through as an opaque string.
const PERSONA_LABELS = {
  tech: 'Tech → AI Upskill',
  data: 'Data Science Update',
  nontech: 'Non-Tech AI Literacy',
  manager: 'AI Management',
};

const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

// Batches every assignment's completion check into one query per call site
// (not one per assignment) - "completed" means the assignee has a real
// AssessmentResults row for that persona dated after the assignment was made,
// same "derive, don't duplicate" approach as LearningPaths' module status.
async function withCompletionStatus(rows) {
  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((row) => row.userId))];
  const results = await db
    .select({ userId: assessmentResults.userId, personaId: assessmentResults.personaId, completedAt: assessmentResults.completedAt })
    .from(assessmentResults)
    .where(inArray(assessmentResults.userId, userIds))
    .orderBy(desc(assessmentResults.completedAt));

  const latestByUserPersona = new Map();
  for (const result of results) {
    const key = `${result.userId}:${result.personaId}`;
    if (!latestByUserPersona.has(key)) latestByUserPersona.set(key, result);
  }

  return rows.map((row) => {
    const latest = latestByUserPersona.get(`${row.userId}:${row.personaId}`);
    const completed = Boolean(latest && new Date(latest.completedAt) > new Date(row.createdAt));
    return { ...row, completed };
  });
}

// POST /api/orgs/:orgId/assessment-assignments
const createAssignment = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { userId, personaId, dueAt } = req.body;
  const assignedBy = req.user.userId;

  const [member] = await db.select({ id: orgMembers.id }).from(orgMembers).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'That user is not a member of this organization');
  }

  const [assignment] = await db.insert(assessmentAssignments).values(withTimestamps({
    id: newId(),
    orgId,
    userId,
    assignedBy,
    personaId,
    dueAt: dueAt ? new Date(dueAt) : null,
  })).returning();

  // Best-effort - a notification failure shouldn't fail the assignment itself.
  try {
    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const trackLabel = PERSONA_LABELS[personaId] || personaId;
    await createNotification({
      userId,
      type: 'assessment_assigned',
      title: `New assessment assigned: ${trackLabel}`,
      message: `${org?.name || 'Your organization'} assigned you the "${trackLabel}" assessment${assignment.dueAt ? ` (due ${new Date(assignment.dueAt).toLocaleDateString()})` : ''}.`,
      data: { assignmentId: assignment.id, orgId, personaId },
    });
  } catch (error) {
    console.error('[Notifications] failed to notify assignee of new assignment:', error.message);
  }

  sendSuccess(res, 'Assessment assigned successfully', { assignment }, HTTP_STATUS.CREATED);
});

// GET /api/orgs/:orgId/assessment-assignments
const listOrgAssignments = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const rows = await db
    .select({
      id: assessmentAssignments.id,
      userId: assessmentAssignments.userId,
      personaId: assessmentAssignments.personaId,
      dueAt: assessmentAssignments.dueAt,
      createdAt: assessmentAssignments.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(assessmentAssignments)
    .innerJoin(users, eq(assessmentAssignments.userId, users.id))
    .where(eq(assessmentAssignments.orgId, orgId))
    .orderBy(desc(assessmentAssignments.createdAt));

  const payload = await withCompletionStatus(rows);
  sendSuccess(res, 'Assignments retrieved successfully', payload);
});

// DELETE /api/orgs/:orgId/assessment-assignments/:assignmentId
const revokeAssignment = asyncHandler(async (req, res) => {
  const { orgId, assignmentId } = req.params;

  const [assignment] = await db.select({ id: assessmentAssignments.id }).from(assessmentAssignments).where(and(eq(assessmentAssignments.id, assignmentId), eq(assessmentAssignments.orgId, orgId))).limit(1);
  if (!assignment) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Assignment not found in this organization');
  }

  await db.delete(assessmentAssignments).where(eq(assessmentAssignments.id, assignmentId));
  sendSuccess(res, 'Assignment revoked successfully');
});

// GET /api/me/assessment-assignments - the assignee's own view
const listMyAssignments = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const rows = await db
    .select()
    .from(assessmentAssignments)
    .where(eq(assessmentAssignments.userId, userId))
    .orderBy(desc(assessmentAssignments.createdAt));

  const payload = await withCompletionStatus(rows);

  // Best-effort "due soon" notification, checked whenever the assignee's own
  // list loads (their Assessments page, on mount) rather than via a
  // background job - this backend has no scheduler/cron infrastructure yet,
  // so this is the pragmatic stand-in. Deduped by looking for an existing
  // notification carrying this assignment's id in its `data`.
  const now = Date.now();
  const dueSoon = payload.filter((assignment) => {
    if (assignment.completed || !assignment.dueAt) return false;
    const msUntilDue = new Date(assignment.dueAt).getTime() - now;
    return msUntilDue > 0 && msUntilDue <= DUE_SOON_WINDOW_MS;
  });

  if (dueSoon.length) {
    try {
      await Promise.all(dueSoon.map(async (assignment) => {
        const [existing] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(
            eq(notifications.userId, userId),
            eq(notifications.type, 'assignment_due_soon'),
            sql`${notifications.data}->>'assignmentId' = ${assignment.id}`,
          ))
          .limit(1);
        if (existing) return;

        const trackLabel = PERSONA_LABELS[assignment.personaId] || assignment.personaId;
        await createNotification({
          userId,
          type: 'assignment_due_soon',
          title: `Assessment due soon: ${trackLabel}`,
          message: `Your "${trackLabel}" assessment is due ${new Date(assignment.dueAt).toLocaleDateString()}.`,
          data: { assignmentId: assignment.id, orgId: assignment.orgId, personaId: assignment.personaId },
        });
      }));
    } catch (error) {
      console.error('[Notifications] failed to create due-soon notification:', error.message);
    }
  }

  sendSuccess(res, 'Your assignments retrieved successfully', payload);
});

module.exports = {
  createAssignment,
  listOrgAssignments,
  revokeAssignment,
  listMyAssignments,
};
