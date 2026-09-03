const { eq, and, ne } = require('drizzle-orm');
const { db } = require('../db/client');
const { organizations, departments, orgMembers, users } = require('../db/schema');
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
  updateMemberRole,
  removeMember,
};
