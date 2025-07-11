import { Hono } from 'hono';
import { errorHandler } from './lib/error-handler';
import { requestLogger } from './lib/logger';
import auth from './modules/auth/route';
import type { AppHono } from './types';

const app = new Hono<AppHono>();

app.use(requestLogger());

app.route('/api/v1/auth', auth);

app.onError(errorHandler());

export default app;
