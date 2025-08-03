import { cloudflareRateLimiter } from '@hono-rate-limiter/cloudflare';
import type { Context } from 'hono';

export const rateLimiterConfig = () => {
  return cloudflareRateLimiter({
    rateLimitBinding: (c: Context) => c.env?.RATE_LIMITER,
    keyGenerator: (c: Context) => {
      // Use IP address as the key for rate limiting
      const ip =
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for') ||
        c.req.header('x-real-ip') ||
        'unknown';
      return ip;
    },
  });
};
