import jwt from 'hono/jwt';
import type { AppContext } from '../types';

export type JWTPayload = {
  userUUID: string;
  username: string;
  iat?: number;
  exp?: number;
  nbf?: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type TokenValidationResult = {
  isValid: boolean;
  payload?: JWTPayload;
  error?: string;
};

const FIVE_MINUTES_IN_SECONDS = 60 * 5;
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export async function generateTokenPair(
  c: AppContext,
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'nbf'>
): Promise<TokenPair> {
  const accessTokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + FIVE_MINUTES_IN_SECONDS,
  };

  const accessToken = await jwt.sign(
    accessTokenPayload,
    c.env.JWT_SECRET_ACCESS
  );

  const refreshTokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ONE_WEEK_IN_SECONDS,
  };

  const refreshToken = await jwt.sign(
    refreshTokenPayload,
    c.env.JWT_SECRET_REFRESH
  );

  return { accessToken, refreshToken };
}

export async function validateAccessToken(
  c: AppContext,
  token: string
): Promise<TokenValidationResult> {
  try {
    const payload = (await jwt.verify(
      token,
      c.env.JWT_SECRET_ACCESS
    )) as JWTPayload;

    return { isValid: true, payload };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

export async function validateRefreshToken(
  c: AppContext,
  token: string
): Promise<TokenValidationResult> {
  try {
    const payload = (await jwt.verify(
      token,
      c.env.JWT_SECRET_REFRESH
    )) as JWTPayload;

    return { isValid: true, payload };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

export async function refreshAccessToken(
  c: AppContext,
  refreshToken: string
): Promise<TokenPair | null> {
  const result = await validateRefreshToken(c, refreshToken);

  if (!(result.isValid && result.payload)) {
    return null;
  }

  return await generateTokenPair(c, result.payload);
}
