import { z } from 'zod';

const passwordForgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

const passwordVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  otp: z
    .string()
    .length(6, 'OTP must be 6 characters long')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

const passwordResetSchema = z.object({
  resetToken: z.string({ message: 'Reset token is required' }).min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number',
    ),
});

module.exports = { passwordForgotSchema, passwordVerifyOtpSchema, passwordResetSchema };
