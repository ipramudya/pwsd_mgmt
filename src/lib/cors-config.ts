import { cors } from 'hono/cors';

export const corsConfig = () => {
  return cors({
    origin: (origin) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://primepass.pages.dev',
      ];

      if (!origin) {
        return 'http://localhost:3000';
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return origin;
      }

      return 'https://primepass.pages.dev';
    },
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86_400,
    credentials: false,
  });
};
