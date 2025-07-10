import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppHono } from '../../types';
import { AuthService } from './service';
import { authValidations } from './validation';

const auth = new Hono<AppHono>();

auth.post('/register', authValidations.register, async (c) => {
  try {
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Registration failed';

    if (message.includes('Username already exists')) {
      throw new HTTPException(409, { message });
    }

    if (message.includes('Password validation failed')) {
      throw new HTTPException(400, { message });
    }

    throw new HTTPException(500, {
      message: 'Internal server error during registration',
    });
  }
});

auth.post('/login', authValidations.login, async (c) => {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';

    if (message.includes('Invalid username or password')) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    throw new HTTPException(500, {
      message: 'Internal server error during login',
    });
  }
});

auth.post('/refresh-token', authValidations.refreshToken, async (c) => {
  try {
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token refresh failed';

    if (message.includes('Invalid') || message.includes('expired')) {
      throw new HTTPException(401, {
        message: 'Invalid or expired refresh token',
      });
    }

    if (message.includes('Account not found')) {
      throw new HTTPException(404, { message: 'Account not found' });
    }

    throw new HTTPException(500, {
      message: 'Internal server error during token refresh',
    });
  }
});

export default auth;
