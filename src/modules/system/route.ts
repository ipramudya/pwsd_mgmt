import { Hono } from 'hono';
import type { AppHono } from '../../types';
import { SystemService } from './service';

const systemRoute = new Hono<AppHono>();

systemRoute.get('/health', async (c) => {
  const service = new SystemService(c);
  const healthInfo = await service.getHealthCheck();

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

systemRoute.get('/health/detailed', async (c) => {
  const service = new SystemService(c);
  const detailedHealthInfo = await service.getDetailedHealthCheck();

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

export default systemRoute;
