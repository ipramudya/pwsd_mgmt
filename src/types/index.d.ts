import type { D1Database } from '@cloudflare/workers-types';
import type { Context } from 'hono';
import { Variables } from 'hono/types';

type Bindings = {
  JWT_SECRET_ACCESS: string;
  JWT_SECRET_REFRESH: string;
  DB: D1Database;
};

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
export type AppHono = { Bindings: Bindings; Variables: Variables };
