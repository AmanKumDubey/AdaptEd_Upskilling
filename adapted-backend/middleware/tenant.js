const { eq, and } = require('drizzle-orm');
const { db } = require('../db/client');
const { orgMembers } = require('../db/schema');
const { sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

// Phase B5: every org-scoped route is nested under /:orgId, and this middleware
// is the tenant boundary - it derives the caller's membership from
// (orgId, userId) and refuses the request outright if none exists, so a fully
// valid session for Org A can never read or write Org B's data by guessing an
// id in the URL. req.orgMember is the only thing downstream handlers trust for
// "which org, and what role" - never req.body/req.query.
const requireOrgMembership = asyncHandler(async (req, res, next) => {
  const { orgId } = req.params;
  const userId = req.user.userId;

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);

  if (!membership) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'You are not a member of this organization');
  }

  req.orgMember = membership;
  next();
});

// Must follow requireOrgMembership - relies on req.orgMember being set.
const requireOrgRole = (...roles) => (req, res, next) => {
  if (!req.orgMember) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Organization membership required');
  }

  if (!roles.includes(req.orgMember.role)) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'Insufficient permissions for this organization');
  }

  next();
};

module.exports = {
  requireOrgMembership,
  requireOrgRole,
};
