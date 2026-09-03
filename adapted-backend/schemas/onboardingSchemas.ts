import { z } from 'zod';

const { ONBOARDING_GOALS, ONBOARDING_INTERESTS, EXPERIENCE_LEVELS, THEME_PREFERENCES } = require('../utilities/constants');

const completeOnboardingSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be between 3-30 characters')
      .max(30, 'Username must be between 3-30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string(),
    goals: z
      .array(z.string())
      .min(1, 'At least one goal must be selected')
      .superRefine((goals, ctx) => {
        const invalid = goals.filter((goal) => !ONBOARDING_GOALS.includes(goal));
        if (invalid.length) {
          ctx.addIssue({ code: 'custom', message: `Invalid goals: ${invalid.join(', ')}` });
        }
      }),
    interests: z
      .array(z.string())
      .min(1, 'At least one interest must be selected')
      .superRefine((interests, ctx) => {
        const invalid = interests.filter((interest) => !ONBOARDING_INTERESTS.includes(interest));
        if (invalid.length) {
          ctx.addIssue({ code: 'custom', message: `Invalid interests: ${invalid.join(', ')}` });
        }
      }),
    experienceLevel: z.enum(EXPERIENCE_LEVELS as [string, ...string[]], {
      message: `Experience level must be one of: ${EXPERIENCE_LEVELS.join(', ')}`,
    }),
    themePreference: z.enum(THEME_PREFERENCES as [string, ...string[]], {
      message: `Theme preference must be one of: ${THEME_PREFERENCES.join(', ')}`,
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

module.exports = { completeOnboardingSchema };
