import type { D1Database } from '@cloudflare/workers-types';
import type { Context } from 'hono';
import type { Logger } from 'pino';

type Bindings = {
  JWT_SECRET_ACCESS: string;
  JWT_SECRET_REFRESH: string;
  DB: D1Database;
};

type Variables = {
  logger?: Logger;
  requestId?: string;
  userId?: string;
  jwtPayload?: Record<string, unknown>;
};

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
export type AppHono = { Bindings: Bindings; Variables: Variables };
