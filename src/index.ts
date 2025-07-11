import { Hono } from 'hono';
import { errorHandler, notFoundHandler } from './lib/error-handler';
import { requestLogger } from './lib/logger';
import authRoute from './modules/auth/route';
import systemRoute from './modules/system/route';
import type { AppHono } from './types';

const app = new Hono<AppHono>();

app.use(requestLogger());

const PREFIX = '/api/v1';

app.route(`${PREFIX}/auth`, authRoute);
app.route(`${PREFIX}/system`, systemRoute);

app.onError(errorHandler());
app.notFound(notFoundHandler());

export default app;
