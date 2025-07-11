import pino from 'pino';
import type { AppContext } from '../types';

// Create Pino logger optimized for Cloudflare Workers
export const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}), // Remove default bindings
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    error: pino.stdSerializers.err,
    req: (req: Request) => ({
      method: req.method,
      url: req.url,
    }),
  },
});

// Hono middleware for request-scoped logging
export function requestLogger() {
  return async (c: AppContext, next: () => Promise<void>) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();

    const contextLogger = logger.child({
      requestId,
      method: c.req.method,
      path: c.req.path,
      ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
      module: 'http',
    });

    // Add logger to context
    c.set('logger', contextLogger);
    c.set('requestId', requestId);

    try {
      await next();
    } catch (error) {
      const duration = Date.now() - start;
      const errorObj =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: error.cause,
            }
          : { message: String(error) };

      contextLogger.error(
        {
          error: errorObj,
          duration,
          statusCode: c.res.status || 500,
          errorDetails: {
            type:
              error instanceof Error ? error.constructor.name : typeof error,
            originalError: error,
          },
        },
        `Request failed: ${errorObj.message || 'Unknown error'}`
      );
      throw error;
    }

    const duration = Date.now() - start;
    const statusCode = c.res.status;

    if (statusCode >= 400) {
      contextLogger.warn(
        {
          duration,
          statusCode,
        },
        'Request completed with error'
      );
    } else {
      contextLogger.info(
        {
          duration,
          statusCode,
        },
        'Request completed'
      );
    }
  };
}

export function getLogger(
  c: AppContext,
  module: string,
  action?: string
): pino.Logger {
  const baseLogger =
    c.get('logger') ||
    logger.child({
      requestId: c.get('requestId'),
      module,
    });

  if (action) {
    return baseLogger.child({ action });
  }

  return baseLogger.child({ module });
}
