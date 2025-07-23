import { Hono } from 'hono';
import { container, inject, injectable } from 'tsyringe';
import type { AppHono } from '../../types';
import AuthService from './service.di';
import { authValidations } from './validation';

@injectable()
export default class AuthRoute {
  readonly route: Hono<AppHono>;

  constructor(
    @inject(AuthService)
    private readonly authService: AuthService
  ) {
    this.route = new Hono<AppHono>();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.useRegisterRoute();
    this.useLoginRoute();
    this.useRefreshTokenRoute();
  }

  private useRegisterRoute() {
    this.route.post('/register', authValidations.register, async (c) => {
      const body = c.req.valid('json');
      const result = await this.authService.register(c, body);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Account created successfully',
        },
        201
      );
    });
  }

  private useLoginRoute() {
    this.route.post('/login', authValidations.login, async (c) => {
      const body = c.req.valid('json');

      const result = await this.authService.login(c, body);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Login successful',
        },
        200
      );
    });
  }

  private useRefreshTokenRoute() {
    this.route.post(
      '/refresh-token',
      authValidations.refreshToken,
      async (c) => {
        const body = c.req.valid('json');
        const result = await this.authService.refreshToken(c, body);

        return c.json(
          {
            success: true,
            data: result,
            message: 'Token refreshed successfully',
          },
          200
        );
      }
    );
  }
}

container.registerSingleton(AuthRoute);
