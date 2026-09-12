import { z } from 'zod';

const email = z
  .string({ required_error: 'An email address is required.' })
  .trim()
  .toLowerCase()
  .min(3, 'That email looks too short.')
  .max(254, 'That email is too long.')
  .email('That does not look like an email address.');

const password = z
  .string({ required_error: 'A password is required.' })
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.')
  .refine((value) => /[a-zA-Z]/.test(value), 'Include at least one letter.')
  .refine((value) => /[0-9]/.test(value), 'Include at least one number.');

const username = z
  .string({ required_error: 'What should we call you?' })
  .trim()
  .min(2, 'At least two characters, please.')
  .max(32, 'Keep it under 32 characters.')
  .regex(/^[\p{L}\p{N} '._-]+$/u, 'Letters, numbers, spaces, and . _ - only.');

// Captured at signup so streaks roll over on the user's own midnight.
const timezone = z.string().trim().max(64).optional();

export const registerSchema = z
  .object({ email, password, username, timezone })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string({ required_error: 'A password is required.' }).min(1, 'Enter your password.'),
    timezone,
  })
  .strict();

export const preferencesSchema = z
  .object({
    theme: z.string().trim().max(32).optional(),
    reducedMotion: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    timezone,
    username: username.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

export default { registerSchema, loginSchema, preferencesSchema };
