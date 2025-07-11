import { Hono } from 'hono';
import type { AppHono } from '../../types';
import { AuthService } from './service';
import { authValidations } from './validation';

const authRoute = new Hono<AppHono>();

authRoute.post('/register', authValidations.register, async (c) => {
  const body = c.req.valid('json');

  const authService = new AuthService(c);
  const result = await authService.register(body);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Account created successfully',
    },
    201
  );
});

authRoute.post('/login', authValidations.login, async (c) => {
  const body = c.req.valid('json');

  const authService = new AuthService(c);
  const result = await authService.login(body);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Login successful',
    },
    200
  );
});

authRoute.post('/refresh-token', authValidations.refreshToken, async (c) => {
  const body = c.req.valid('json');

  const authService = new AuthService(c);
  const result = await authService.refreshToken(body);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Token refreshed successfully',
    },
    200
  );
});

export default authRoute;
