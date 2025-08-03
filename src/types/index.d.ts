import type { Context } from 'hono';
import type { Logger } from 'pino';

type Bindings = {
  JWT_SECRET_ACCESS: string;
  JWT_SECRET_REFRESH: string;
  DB_URL: string;
  DB_TOKEN: string;
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
};

type Variables = {
  logger?: Logger;
  requestId?: string;
  userId?: string;
  jwtPayload?: Record<string, unknown>;
};

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
export type AppHono = { Bindings: Bindings; Variables: Variables };
