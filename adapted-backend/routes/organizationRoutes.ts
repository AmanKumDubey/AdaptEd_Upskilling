import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireOrgMembership, requireOrgRole } = require('../middleware/tenant');
const { validate } = require('../middleware/validate');
const {
  createOrganizationSchema,
  createDepartmentSchema,
  updateMemberRoleSchema,
  inviteMemberSchema,
  orgIdParamSchema,
  memberIdParamSchema,
  invitationIdParamSchema,
} = require('../schemas/organizationSchemas');
const {
  createOrganization,
  listMyOrganizations,
  getOrganization,
  createDepartment,
  listDepartments,
  listMembers,
  getTeamProgress,
  updateMemberRole,
  removeMember,
} = require('../controllers/organizationController');
const {
  createInvitation,
  listInvitations,
  revokeInvitation,
} = require('../controllers/invitationController');

// All routes below require authentication
router.use(authenticate);

// POST /api/orgs
router.post('/', validate(createOrganizationSchema), createOrganization);

// GET /api/orgs
router.get('/', listMyOrganizations);

// Everything under /:orgId requires org membership - this is the tenant
// boundary; no route past this line can be reached without a real
// (orgId, userId) row in OrgMembers.
router.use('/:orgId', validate(orgIdParamSchema, 'params'), requireOrgMembership);

// GET /api/orgs/:orgId
router.get('/:orgId', getOrganization);

// POST /api/orgs/:orgId/departments
router.post('/:orgId/departments', requireOrgRole('owner', 'admin'), validate(createDepartmentSchema), createDepartment);

// GET /api/orgs/:orgId/departments
router.get('/:orgId/departments', listDepartments);

// GET /api/orgs/:orgId/members
router.get('/:orgId/members', listMembers);

// GET /api/orgs/:orgId/team-progress - exposes per-person performance data,
// so unlike the plain roster above this is owner/admin/hr only.
router.get('/:orgId/team-progress', requireOrgRole('owner', 'admin', 'hr'), getTeamProgress);

// PUT /api/orgs/:orgId/members/:memberId/role
router.put(
  '/:orgId/members/:memberId/role',
  requireOrgRole('owner', 'admin'),
  validate(memberIdParamSchema, 'params'),
  validate(updateMemberRoleSchema),
  updateMemberRole,
);

// DELETE /api/orgs/:orgId/members/:memberId
router.delete(
  '/:orgId/members/:memberId',
  requireOrgRole('owner', 'admin'),
  validate(memberIdParamSchema, 'params'),
  removeMember,
);

// POST /api/orgs/:orgId/invitations
router.post(
  '/:orgId/invitations',
  requireOrgRole('owner', 'admin', 'hr'),
  validate(inviteMemberSchema),
  createInvitation,
);

// GET /api/orgs/:orgId/invitations
router.get('/:orgId/invitations', requireOrgRole('owner', 'admin', 'hr'), listInvitations);

// DELETE /api/orgs/:orgId/invitations/:invitationId
router.delete(
  '/:orgId/invitations/:invitationId',
  requireOrgRole('owner', 'admin', 'hr'),
  validate(invitationIdParamSchema, 'params'),
  revokeInvitation,
);

module.exports = router;
