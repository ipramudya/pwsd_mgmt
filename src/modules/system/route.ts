import { Hono } from 'hono';
import { container, inject, injectable } from 'tsyringe';
import type { AppHono } from '../../types';
import SystemService from './service';

@injectable()
export default class SystemRoute {
  readonly route: Hono<AppHono>;

  constructor(
    @inject(SystemService)
    private readonly service: SystemService
  ) {
    this.route = new Hono<AppHono>();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.useGetHealthCheckRoute();
    this.useGetDetailedHealthCheckRoute();
  }

  private useGetHealthCheckRoute() {
    this.route.get('/health', (c) => {
      const healthInfo = this.service.getHealthCheck(c);

      if (healthInfo.status === 'unhealthy') {
        return c.json(
          {
            success: false,
            data: healthInfo,
          },
          503
        );
      }

      return c.json(
        {
          success: true,
          data: healthInfo,
        },
        200
      );
    });
  }

  private useGetDetailedHealthCheckRoute() {
    this.route.get('/health/detailed', async (c) => {
      const detailedHealthInfo = await this.service.getDetailedHealthCheck(c);

      if (detailedHealthInfo.status === 'unhealthy') {
        return c.json(
          {
            success: false,
            data: detailedHealthInfo,
          },
          503
        );
      }

      return c.json(
        {
          success: true,
          data: detailedHealthInfo,
        },
        200
      );
    });
  }
}

container.registerSingleton(SystemRoute);
