import z from 'zod';
import { zValidator } from '../../lib/validator-wrapper';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

const login = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
    .max(USERNAME_MAX_LENGTH, `Username must not exceed ${USERNAME_MAX_LENGTH} characters`)
    .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`),
});

const register = z
  .object({
    username: z
      .string()
      .min(1, 'Username is required')
      .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
      .max(USERNAME_MAX_LENGTH, `Username must not exceed ${USERNAME_MAX_LENGTH} characters`)
      .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    confirmPassword: z
      .string()
      .min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const refreshToken = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, 'Invalid refresh token format'),
});

export const authValidations = {
  login: zValidator('json', login, 'Login validation failed'),
  register: zValidator('json', register, 'Registration validation failed'),
  refreshToken: zValidator('json', refreshToken, 'Refresh token validation failed'),
};

export const authSchemas = {
  login,
  register,
  refreshToken,
};