const { eq, and, ne, inArray, desc, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { organizations, departments, orgMembers, users, assessmentResults, learningPaths, userCourses } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler, generateSlug } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

// Appends -2, -3, ... to a base slug until it's free. Organizations are rare
// enough (created by hand, not per-request at scale) that a loop here is fine.
const uniqueSlug = async (base) => {
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, candidate)).limit(1);
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
};

// POST /api/orgs
const createOrganization = asyncHandler(async (req, res) => {
  const { name, slug } = req.body;
  const userId = req.user.userId;

  const baseSlug = generateSlug(slug || name);
  const finalSlug = await uniqueSlug(baseSlug);

  const [org] = await db.insert(organizations).values(withTimestamps({
    id: newId(),
    name,
    slug: finalSlug,
  })).returning();

  // Creator becomes the first owner - there is no other path to an org existing
  // with zero owners.
  await db.insert(orgMembers).values(withTimestamps({
    id: newId(),
    orgId: org.id,
    userId,
    departmentId: null,
    role: 'owner',
  }));

  sendSuccess(res, 'Organization created successfully', { organization: org }, HTTP_STATUS.CREATED);
});

// GET /api/orgs - organizations the caller belongs to, with their role in each
const listMyOrganizations = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const rows = await db
    .select({ organization: organizations, membership: orgMembers })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));

  const payload = rows.map(({ organization, membership }) => ({
    ...organization,
    role: membership.role,
    departmentId: membership.departmentId,
  }));

  sendSuccess(res, 'Organizations retrieved successfully', payload);
});

// GET /api/orgs/:orgId - requireOrgMembership has already confirmed membership
const getOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Organization not found');
  }

  sendSuccess(res, 'Organization retrieved successfully', { ...org, role: req.orgMember.role });
});

// POST /api/orgs/:orgId/departments
const createDepartment = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { name } = req.body;

  const [department] = await db.insert(departments).values(withTimestamps({
    id: newId(),
    orgId,
    name,
  })).returning();

  sendSuccess(res, 'Department created successfully', { department }, HTTP_STATUS.CREATED);
});

// GET /api/orgs/:orgId/departments
const listDepartments = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const rows = await db.select().from(departments).where(eq(departments.orgId, orgId));
  sendSuccess(res, 'Departments retrieved successfully', rows);
});

// GET /api/orgs/:orgId/members
const listMembers = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const rows = await db
    .select({
      id: orgMembers.id,
      role: orgMembers.role,
      departmentId: orgMembers.departmentId,
      createdAt: orgMembers.createdAt,
      userId: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId));

  sendSuccess(res, 'Members retrieved successfully', rows);
});

// GET /api/orgs/:orgId/team-progress - each member's real assessment/learning
// path/course-completion standing (Phase B10). Exposes per-person
// performance data, so this is owner/admin/hr only (see organizationRoutes.ts) -
// unlike listMembers, which is a plain roster and open to every member.
const getTeamProgress = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const members = await db
    .select({
      id: orgMembers.id,
      role: orgMembers.role,
      departmentId: orgMembers.departmentId,
      userId: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId));

  const memberIds = members.map((m) => m.userId);
  if (!memberIds.length) {
    return sendSuccess(res, 'Team progress retrieved successfully', []);
  }

  // Three batch queries (not one per member) - fine for org sizes this
  // feature is meant for; "latest per user" is reduced in JS below rather
  // than with a DISTINCT ON, to stay portable and easy to follow.
  const [allResults, allPaths, completedCourseCounts] = await Promise.all([
    db.select().from(assessmentResults).where(inArray(assessmentResults.userId, memberIds)).orderBy(desc(assessmentResults.completedAt)),
    db.select().from(learningPaths).where(inArray(learningPaths.userId, memberIds)),
    db.select({ userId: userCourses.userId, count: sql`count(*)::int` }).from(userCourses)
      .where(and(inArray(userCourses.userId, memberIds), eq(userCourses.status, 'completed')))
      .groupBy(userCourses.userId),
  ]);

  const latestResultByUser = new Map();
  const assessmentCountByUser = new Map();
  for (const result of allResults) {
    if (!latestResultByUser.has(result.userId)) latestResultByUser.set(result.userId, result);
    assessmentCountByUser.set(result.userId, (assessmentCountByUser.get(result.userId) || 0) + 1);
  }
  const pathByUser = new Map(allPaths.map((p) => [p.userId, p]));
  const courseCountByUser = new Map(completedCourseCounts.map((c) => [c.userId, Number(c.count)]));

  const payload = members.map((member) => {
    const latest = latestResultByUser.get(member.userId);
    const path = pathByUser.get(member.userId);
    const allModules = path ? (path.stages || []).flatMap((stage) => stage.modules) : [];
    const completedCount = path ? (path.completedModuleIds || []).length : 0;

    return {
      ...member,
      latestAssessment: latest ? {
        personaId: latest.personaId,
        score: latest.score,
        level: latest.level,
        domainScores: latest.domainScores,
        completedAt: latest.completedAt,
      } : null,
      learningPath: path ? {
        targetRole: path.targetRole,
        currentLevel: path.currentLevel,
        targetLevel: path.targetLevel,
        completedModules: completedCount,
        totalModules: allModules.length,
        percentage: allModules.length ? Math.round((completedCount / allModules.length) * 100) : 0,
      } : null,
      assessmentsCompleted: assessmentCountByUser.get(member.userId) || 0,
      coursesCompleted: courseCountByUser.get(member.userId) || 0,
    };
  });

  sendSuccess(res, 'Team progress retrieved successfully', payload);
});

// PUT /api/orgs/:orgId/members/:memberId/role
const updateMemberRole = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;
  const { role } = req.body;

  const [member] = await db.select().from(orgMembers).where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Member not found in this organization');
  }

  if (member.role === 'owner' && role !== 'owner') {
    const [otherOwner] = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'owner'), ne(orgMembers.id, memberId)))
      .limit(1);

    if (!otherOwner) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Cannot change role: this organization would be left with no owner');
    }
  }

  const [updated] = await db.update(orgMembers).set(touch({ role })).where(eq(orgMembers.id, memberId)).returning();
  sendSuccess(res, 'Member role updated successfully', { member: updated });
});

// PUT /api/orgs/:orgId/members/:memberId/department - null unassigns
const updateMemberDepartment = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;
  const { departmentId } = req.body;

  const [member] = await db.select({ id: orgMembers.id }).from(orgMembers).where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Member not found in this organization');
  }

  if (departmentId) {
    const [department] = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, departmentId), eq(departments.orgId, orgId))).limit(1);
    if (!department) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Department not found in this organization');
    }
  }

  const [updated] = await db.update(orgMembers).set(touch({ departmentId: departmentId || null })).where(eq(orgMembers.id, memberId)).returning();
  sendSuccess(res, 'Member department updated successfully', { member: updated });
});

// DELETE /api/orgs/:orgId/members/:memberId
const removeMember = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;

  const [member] = await db.select().from(orgMembers).where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId))).limit(1);
  if (!member) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Member not found in this organization');
  }

  if (member.role === 'owner') {
    const [otherOwner] = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'owner'), ne(orgMembers.id, memberId)))
      .limit(1);

    if (!otherOwner) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Cannot remove the only owner of this organization');
    }
  }

  await db.delete(orgMembers).where(eq(orgMembers.id, memberId));
  sendSuccess(res, 'Member removed successfully');
});

module.exports = {
  createOrganization,
  listMyOrganizations,
  getOrganization,
  createDepartment,
  listDepartments,
  listMembers,
  getTeamProgress,
  updateMemberRole,
  updateMemberDepartment,
  removeMember,
};
