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

fieldRoute.get('/block/:blockId', async (c) => {
  const blockId = c.req.param('blockId');
  const userId = c.get('userId') as string;

  const fieldService = new FieldService(c);
  const result = await fieldService.getFieldsWithDecryptedPasswords(
    blockId,
    userId
  );

  return c.json(
    {
      success: true,
      data: { fields: result },
      message: 'Fields retrieved successfully',
    },
    200
  );
});

fieldRoute.get('/:fieldId', async (c) => {
  const fieldId = c.req.param('fieldId');
  const userId = c.get('userId') as string;

  const fieldService = new FieldService(c);
  const result = await fieldService.getFieldWithDecryptedPassword(
    fieldId,
    userId
  );

  if (!result) {
    return c.json(
      {
        success: false,
        message: 'Field not found',
      },
      404
    );
  }

  return c.json(
    {
      success: true,
      data: { field: result },
      message: 'Field retrieved successfully',
    },
    200
  );
});

export default fieldRoute;
