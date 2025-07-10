import z from 'zod';
import { zValidator } from '../validator-wrapper';

const login = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const register = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const refreshToken = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const authValidations = {
  login: zValidator('json', login, 'Login validation failed'),
  register: zValidator('json', register, 'Registration validation failed'),
  refreshToken: zValidator(
    'json',
    refreshToken,
    'Refresh token validation failed'
  ),
};
