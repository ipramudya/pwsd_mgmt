import { Hono } from 'hono';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import { SearchService } from './service';
import { searchValidations } from './validation';

const searchRoute = new Hono<AppHono>();

searchRoute.use(authMiddleware);

searchRoute.get('/', searchValidations.search, async (c) => {
  const query = c.req.valid('query');
  const userId = c.get('userId') as string;

  const searchService = new SearchService(c);
  const result = await searchService.search(query, userId);

  return c.json(
    {
      success: true,
      data: result,
      message: 'Search completed successfully',
    },
    200
  );
});

export default searchRoute;
