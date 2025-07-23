import { Hono } from 'hono';
import { container, inject, injectable } from 'tsyringe';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import BlockService from './service.di';
import { blockValidations } from './validation';

@injectable()
export default class BlockRoute {
  readonly route: Hono<AppHono>;

  constructor(
    @inject(BlockService)
    private readonly blockService: BlockService
  ) {
    this.route = new Hono<AppHono>();
    this.route.use(authMiddleware);
    this.setupRoutes();
  }

  private setupRoutes() {
    this.useCreateBlockRoute();
    this.useGetBlocksRoute();
    this.useGetBlockChildrenRoute();
    this.useGetBreadcrumbsRoute();
    this.useUpdateBlockRoute();
    this.useMoveBlockRoute();
    this.useDeleteBlockRoute();
    this.useGetRecentBlocksRoute();
    this.useGetRecentUpdatedBlocksRoute();
  }

  private useCreateBlockRoute() {
    this.route.post('/', blockValidations.createBlock, async (c) => {
      const body = c.req.valid('json');
      const userId = c.get('userId') as string;

      const result = await this.blockService.createBlock(c, body, userId);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Block created successfully',
        },
        201
      );
    });
  }

  private useGetBlocksRoute() {
    this.route.get('/', blockValidations.getBlocks, async (c) => {
      const query = c.req.valid('query');
      const userId = c.get('userId') as string;

      const result = await this.blockService.getBlocks(c, query, userId);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Blocks and fields retrieved successfully',
        },
        200
      );
    });
  }

  private useGetBlockChildrenRoute() {
    this.route.get('/:id', async (c) => {
      const blockId = c.req.param('id');
      const userId = c.get('userId') as string;

      const result = await this.blockService.getBlocks(
        c,
        { parentId: blockId },
        userId
      );

      return c.json(
        {
          success: true,
          data: result,
          message: 'Child blocks and fields retrieved successfully',
        },
        200
      );
    });
  }

  private useGetBreadcrumbsRoute() {
    this.route.get('/:id/breadcrumbs', async (c) => {
      const blockId = c.req.param('id');
      const userId = c.get('userId') as string;

      const result = await this.blockService.getBreadcrumbs(
        c,
        { blockId },
        userId
      );

      return c.json(
        {
          success: true,
          data: result,
          message: 'Breadcrumbs retrieved successfully',
        },
        200
      );
    });
  }

  private useUpdateBlockRoute() {
    this.route.put('/:id', blockValidations.updateBlock, async (c) => {
      const blockId = c.req.param('id');
      const body = c.req.valid('json');
      const userId = c.get('userId') as string;

      const result = await this.blockService.updateBlock(
        c,
        blockId,
        body,
        userId
      );

      return c.json(
        {
          success: true,
          data: result,
          message: 'Block updated successfully',
        },
        200
      );
    });
  }

  private useMoveBlockRoute() {
    this.route.put('/:id/move', blockValidations.moveBlock, async (c) => {
      const blockId = c.req.param('id');
      const body = c.req.valid('json');
      const userId = c.get('userId') as string;

      await this.blockService.moveBlock(c, blockId, body, userId);

      return c.json(
        {
          success: true,
          message: 'Block moved successfully',
        },
        200
      );
    });
  }

  private useDeleteBlockRoute() {
    this.route.delete('/:id', blockValidations.deleteBlock, async (c) => {
      const blockId = c.req.param('id');
      const body = c.req.valid('json');
      const userId = c.get('userId') as string;

      await this.blockService.deleteBlock(
        c,
        blockId,
        userId,
        body.confirmationName
      );

      return c.json(
        {
          success: true,
          message: 'Block deleted successfully',
        },
        200
      );
    });
  }

  private useGetRecentBlocksRoute() {
    this.route.get('/recent', blockValidations.recentBlocks, async (c) => {
      const query = c.req.valid('query');
      const userId = c.get('userId') as string;

      const result = await this.blockService.getRecentBlocks(c, query, userId);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Recent blocks retrieved successfully',
        },
        200
      );
    });
  }

  private useGetRecentUpdatedBlocksRoute() {
    this.route.get(
      '/recent-updates',
      blockValidations.recentBlocks,
      async (c) => {
        const query = c.req.valid('query');
        const userId = c.get('userId') as string;

        const result = await this.blockService.getRecentUpdatedBlocks(
          c,
          query,
          userId
        );

        return c.json(
          {
            success: true,
            data: result,
            message: 'Recent updated blocks retrieved successfully',
          },
          200
        );
      }
    );
  }
}

container.registerSingleton(BlockRoute);
