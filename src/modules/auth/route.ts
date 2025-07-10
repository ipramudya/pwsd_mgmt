import { Hono } from 'hono';
import { authValidations } from '../../lib/validations/auth';

const auth = new Hono();

auth.post('/login', authValidations.login, (c) => {
  return c.json({ message: 'register success' }, 200);
});

auth.post('/register', authValidations.register, (c) => {
  return c.json({ message: 'register success' }, 201);
});

auth.post('/refresh-token', authValidations.refreshToken, (c) => {
  return c.json({ message: 'refresh token success' }, 200);
});

export default auth;
