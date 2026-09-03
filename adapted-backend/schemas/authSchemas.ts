import { z } from 'zod';

const usernameField = z
  .string()
  .trim()
  .min(3, 'Username must be between 3-30 characters')
  .max(30, 'Username must be between 3-30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[\d\s\-()]+$/, 'Please provide a valid phone number')
  .optional()
  .or(z.literal(''));

const registerSchema = z.object({
  username: usernameField.optional(),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().trim().max(50, 'First name must be less than 50 characters').optional(),
  lastName: z.string().trim().max(50, 'Last name must be less than 50 characters').optional(),
  phone: phoneField,
  goals: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  themePreference: z.enum(['light', 'dark']).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});

const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(50, 'First name must be between 1-50 characters').optional(),
  lastName: z.string().trim().min(1).max(50, 'Last name must be between 1-50 characters').optional(),
  phone: phoneField,
  gender: z.string().trim().max(20, 'Gender must be less than 20 characters').optional(),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').optional(),
  goals: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string({ message: 'Current password is required' }).min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one lowercase letter, one uppercase letter, and one number',
    ),
});

module.exports = { registerSchema, loginSchema, profileUpdateSchema, passwordChangeSchema };
