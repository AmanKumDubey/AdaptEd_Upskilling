import { z } from 'zod';

// The client sends the handful of onboarding fields the generator needs
// (see services/learningPathEngine.js) rather than the backend storing the
// full onboarding wizard - that stays local/frontend-driven for now.
// Phase B27: hoursPerWeek arrives as a string from OnboardingFlow.jsx's
// <input type="number"> (event.target.value is always a string, even for a
// number input) - z.number() with no coercion rejected every real onboarding
// profile's value, failing every learning-path generation for every real
// user with a 422 ("Validation failed"). Every other numeric query/body
// field in this codebase already uses z.coerce.number() for exactly this
// reason; this one was the one place that didn't.
const generatePathSchema = z.object({
  targetRole: z.string().trim().min(1).max(255).optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(80).optional(),
  learningFormats: z.array(z.string()).optional(),
  learningPace: z.string().trim().max(100).optional(),
  // Opaque to the server - echoed back verbatim so the client's own
  // isLearningPathStale() can compare it against a freshly computed one.
  sourceFingerprint: z.string().max(1000).optional(),
});

const moduleIdParamSchema = z.object({
  moduleId: z.string().trim().min(1).max(100),
});

module.exports = { generatePathSchema, moduleIdParamSchema };
