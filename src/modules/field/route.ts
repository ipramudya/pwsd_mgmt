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

fieldRoute.put('/block/:blockId', fieldValidations.updateFields, async (c) => {
  const blockId = c.req.param('blockId');
  const body = c.req.valid('json');
  const userId = c.get('userId') as string;

  const fieldService = new FieldService(c);
  const result = await fieldService.updateFields(blockId, body, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Fields updated successfully',
    },
    200
  );
});

fieldRoute.delete(
  '/block/:blockId',
  fieldValidations.deleteFields,
  async (c) => {
    const blockId = c.req.param('blockId');
    const body = c.req.valid('json');
    const userId = c.get('userId') as string;

    const fieldService = new FieldService(c);
    const result = await fieldService.deleteFields(blockId, body, userId);

    return c.json(
      {
        success: true,
        data: result,
        message: 'Fields deleted successfully',
      },
      200
    );
  }
);

export default fieldRoute;
