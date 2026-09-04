import { z } from 'zod';

const personaIdField = z.enum(['tech', 'data', 'nontech', 'manager']);

const startSessionSchema = z.object({
  personaId: personaIdField,
});

const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('Invalid session id'),
});

const resultIdParamSchema = z.object({
  resultId: z.string().uuid('Invalid result id'),
});

const answerQuestionSchema = z.object({
  questionId: z.string().uuid('Invalid question id'),
  selectedIndex: z.number().int().min(0).max(3),
  currentQuestion: z.number().int().min(0).optional(),
});

module.exports = {
  startSessionSchema,
  sessionIdParamSchema,
  resultIdParamSchema,
  answerQuestionSchema,
};
