import { Hono } from 'hono';
import { container, inject, injectable } from 'tsyringe';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import FieldService from './service.di';
import { fieldValidations } from './validation';

@injectable()
export default class FieldRoute {
  readonly route: Hono<AppHono>;

  constructor(
    @inject(FieldService)
    private readonly fieldService: FieldService
  ) {
    this.route = new Hono<AppHono>();
    this.route.use(authMiddleware);
    this.setupRoutes();
  }

  private setupRoutes() {
    this.useCreateFieldsRoute();
    this.useUpdateFieldRoute();
    this.useDeleteFieldsRoute();
  }

  private useCreateFieldsRoute() {
    this.route.post('/', fieldValidations.createFields, async (c) => {
      const body = c.req.valid('json');
      const userId = c.get('userId') as string;

      const result = await this.fieldService.createFields(c, body, userId);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Fields created successfully',
        },
        201
      );
    });
  }

  private useUpdateFieldRoute() {
    this.route.put(
      '/block/:blockId',
      fieldValidations.updateFields,
      async (c) => {
        const blockId = c.req.param('blockId');
        const body = c.req.valid('json');
        const userId = c.get('userId') as string;

        const result = await this.fieldService.updateFields(
          c,
          blockId,
          body,
          userId
        );

        return c.json(
          {
            success: true,
            data: result,
            message: 'Fields updated successfully',
          },
          200
        );
      }
    );
  }

  private useDeleteFieldsRoute() {
    this.route.delete(
      '/block/:blockId',
      fieldValidations.deleteFields,
      async (c) => {
        const blockId = c.req.param('blockId');
        const body = c.req.valid('json');
        const userId = c.get('userId') as string;

        const result = await this.fieldService.deleteFields(
          c,
          blockId,
          body,
          userId
        );

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
  }
}

container.registerSingleton(FieldRoute);
