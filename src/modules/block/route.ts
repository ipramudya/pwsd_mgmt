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
  const userId = c.get('userId') as string;

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

blockRoute.get('/:id', async (c) => {
  const blockId = c.req.param('id');
  const userId = c.get('userId') as string;

  const blockService = new BlockService(c);
  const result = await blockService.getBlocks({ parentId: blockId }, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Child blocks retrieved successfully',
    },
    200
  );
});

blockRoute.get('/:id/breadcrumbs', async (c) => {
  const blockId = c.req.param('id');
  const userId = c.get('userId') as string;

  const blockService = new BlockService(c);
  const result = await blockService.getBreadcrumbs({ blockId }, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Breadcrumbs retrieved successfully',
    },
    200
  );
});

blockRoute.put('/:id', blockValidations.updateBlock, async (c) => {
  const blockId = c.req.param('id');
  const body = c.req.valid('json');
  const userId = c.get('userId') as string;

  const blockService = new BlockService(c);
  const result = await blockService.updateBlock(blockId, body, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Block updated successfully',
    },
    200
  );
});

blockRoute.put('/:id/move', blockValidations.moveBlock, async (c) => {
  const blockId = c.req.param('id');
  const body = c.req.valid('json');
  const userId = c.get('userId') as string;

  const blockService = new BlockService(c);
  await blockService.moveBlock(blockId, body, userId);

  return c.json(
    {
      success: true,
      message: 'Block moved successfully',
    },
    200
  );
});

blockRoute.delete('/:id', blockValidations.deleteBlock, async (c) => {
  const blockId = c.req.param('id');
  const body = c.req.valid('json');
  const userId = c.get('userId') as string;

  const blockService = new BlockService(c);
  await blockService.deleteBlock(blockId, userId, body.confirmationName);

  return c.json(
    {
      success: true,
      message: 'Block deleted successfully',
    },
    200
  );
});

export default blockRoute;
