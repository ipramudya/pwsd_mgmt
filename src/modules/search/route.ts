import { Hono } from 'hono';
import { inject, injectable } from 'tsyringe';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import SearchService from './service';
import { searchValidations } from './validation';

@injectable()
export default class SearchRoute {
  readonly route: Hono<AppHono>;

  constructor(
    @inject(SearchService)
    private readonly service: SearchService
  ) {
    this.route = new Hono<AppHono>();
    this.route.use(authMiddleware);
    this.setupRoutes();
  }

  private setupRoutes() {
    this.useSearchRoute();
  }

  private useSearchRoute() {
    this.route.get('/', searchValidations.search, async (c) => {
      const query = c.req.valid('query');
      const userId = c.get('userId') as string;

      const result = await this.service.search(c, query, userId);

      return c.json(
        {
          success: true,
          data: result,
          message: 'Search completed successfully',
        },
        200
      );
    });
  }
}
