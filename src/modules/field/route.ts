import { Hono } from 'hono';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import { FieldService } from './service';
import { fieldValidations } from './validation';

const fieldRoute = new Hono<AppHono>();

fieldRoute.use(authMiddleware);

fieldRoute.post('/', fieldValidations.createFields, async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId') as string;

  const fieldService = new FieldService(c);
  const result = await fieldService.createFields(body, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Fields created successfully',
    },
    201
  );
});

export default fieldRoute;
