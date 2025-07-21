import type { AppContext } from '../types';

export const corsMiddleware = async (
  c: AppContext,
  next: () => Promise<void>
) => {
  const origin = c.req.header('Origin');
  const requestMethod = c.req.header('Access-Control-Request-Method');
  const requestHeaders = c.req.header('Access-Control-Request-Headers');

  // Determine the appropriate origin
  let allowOrigin = '*';
  if (
    origin &&
    (origin.includes('localhost') || origin.includes('127.0.0.1'))
  ) {
    allowOrigin = origin;
  }

  // Set CORS headers for all responses
  c.header('Access-Control-Allow-Origin', allowOrigin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Handle CORS preflight requests
  if (
    c.req.method === 'OPTIONS' &&
    origin !== null &&
    requestMethod !== null &&
    requestHeaders !== null
  ) {
    // Set the specific headers that were requested
    c.header('Access-Control-Allow-Headers', requestHeaders);
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          requestHeaders || 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Handle standard OPTIONS requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();
};
