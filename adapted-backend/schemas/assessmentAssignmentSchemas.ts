import { z } from 'zod';

const personaIdField = z.enum(['tech', 'data', 'nontech', 'manager']);

const createAssignmentSchema = z.object({
  userId: z.string().uuid('Invalid user id'),
  personaId: personaIdField,
  dueAt: z.string().datetime({ message: 'dueAt must be an ISO date-time string' }).optional(),
});

const assignmentIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization id'),
  assignmentId: z.string().uuid('Invalid assignment id'),
});

module.exports = { createAssignmentSchema, assignmentIdParamSchema };
