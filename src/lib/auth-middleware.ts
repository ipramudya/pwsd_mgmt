import type { AppContext } from '../types';
import { AuthenticationError } from './error-handler';
import { validateAccessToken } from './tokenizer';

export const authMiddleware = async (
  c: AppContext,
  next: () => Promise<void>
) => {
  const authorization = c.req.header('Authorization');

  if (!authorization) {
    throw new AuthenticationError('Authorization header is required');
  }

  if (!authorization.startsWith('Bearer ')) {
    throw new AuthenticationError(
      'Authorization header must start with Bearer'
    );
  }

  const token = authorization.slice(7);

  if (!token) {
    throw new AuthenticationError('Access token is required');
  }

  const result = await validateAccessToken(c, token);

  if (!(result.isValid && result.payload)) {
    throw new AuthenticationError('Invalid or expired access token');
  }

  c.set('userId', result.payload.userUUID);
  c.set('jwtPayload', result.payload);

  await next();
};
