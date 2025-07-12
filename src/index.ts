import { Hono } from 'hono';
import { errorHandler, notFoundHandler } from './lib/error-handler';
import { requestLogger } from './lib/logger';
import authRoute from './modules/auth/route';
import blockRoute from './modules/block/route';
import fieldRoute from './modules/field/route';
import systemRoute from './modules/system/route';
import type { AppHono } from './types';

const app = new Hono<AppHono>();

app.use(requestLogger());

const PREFIX = '/api/v1';

app.route(`${PREFIX}/auth`, authRoute);
app.route(`${PREFIX}/blocks`, blockRoute);
app.route(`${PREFIX}/fields`, fieldRoute);
app.route(`${PREFIX}/system`, systemRoute);

app.onError(errorHandler());
app.notFound(notFoundHandler());

export default app;
