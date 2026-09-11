import { z } from 'zod';

const verifySkillSchema = z.object({
  skillName: z.string().trim().min(1).max(255),
});

const memberSkillParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization id'),
  memberId: z.string().uuid('Invalid member id'),
  skillName: z.string().trim().min(1).max(255),
});

module.exports = { verifySkillSchema, memberSkillParamSchema };
