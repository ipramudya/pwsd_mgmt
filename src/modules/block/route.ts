import { Hono } from 'hono';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import { BlockService } from './service';
import { blockValidations } from './validation';

const blockRoute = new Hono<AppHono>();

blockRoute.use(authMiddleware);

blockRoute.post('/', blockValidations.createBlock, async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId') as string; // Safe to cast since auth middleware guarantees this

  const blockService = new BlockService(c);
  const result = await blockService.createBlock(body, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Block created successfully',
    },
    201
  );
});

blockRoute.get('/', blockValidations.getBlocks, async (c) => {
  const query = c.req.valid('query');
  const userId = c.get('userId') as string; // Safe to cast since auth middleware guarantees this

  const blockService = new BlockService(c);
  const result = await blockService.getBlocks(query, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Blocks retrieved successfully',
    },
    200
  );
});

export default blockRoute;
