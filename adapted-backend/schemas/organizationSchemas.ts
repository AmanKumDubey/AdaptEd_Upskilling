import { z } from 'zod';

// Phase B5: greenfield - these routes had nothing before, so every schema here
// is new coverage, not a migration of existing rules.

const orgRoleEnum = z.enum(['owner', 'admin', 'hr', 'member']);

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug must be between 3-100 characters')
  .max(100, 'Slug must be between 3-100 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  slug: slugField.optional(),
});

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
});

const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  role: orgRoleEnum.optional().default('member'),
  departmentId: z.string().uuid('Invalid department id').optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'token is required'),
});

const updateMemberRoleSchema = z.object({
  role: orgRoleEnum,
});

const orgIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization id'),
});

const departmentIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization id'),
  departmentId: z.string().uuid('Invalid department id'),
});

const memberIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization id'),
  memberId: z.string().uuid('Invalid member id'),
});

const invitationIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization id'),
  invitationId: z.string().uuid('Invalid invitation id'),
});

module.exports = {
  createOrganizationSchema,
  createDepartmentSchema,
  inviteMemberSchema,
  acceptInvitationSchema,
  updateMemberRoleSchema,
  orgIdParamSchema,
  departmentIdParamSchema,
  memberIdParamSchema,
  invitationIdParamSchema,
};
