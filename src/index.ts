import { Hono } from 'hono';
import { logger } from 'hono/logger';
import auth from './modules/auth/route';
import type { AppHono } from './types';

const app = new Hono<AppHono>();

app.use(logger());
app.route('/api/v1/auth', auth);

export default app;
