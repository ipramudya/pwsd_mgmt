import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppContext } from '../types';
import { getLogger } from './logger';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
  };
}

export class AppError extends HTTPException {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(status as ContentfulStatusCode, { message });
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message = 'Authentication failed',
    details?: Record<string, unknown>
  ) {
    super(401, ErrorCode.AUTHENTICATION_ERROR, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    details?: Record<string, unknown>
  ) {
    super(404, ErrorCode.NOT_FOUND, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict',
    details?: Record<string, unknown>
  ) {
    super(409, ErrorCode.CONFLICT, message, details);
  }
}

export class DatabaseError extends AppError {
  constructor(
    message = 'Database operation failed',
    details?: Record<string, unknown>
  ) {
    super(500, ErrorCode.DATABASE_ERROR, message, details);
  }
}

export function errorHandler() {
  return (err: Error, c: AppContext) => {
    const logger = getLogger(c, 'error-handler');
    const requestId = c.get('requestId');
    const timestamp = new Date().toISOString();

    if (err instanceof AppError) {
      logger.error(
        {
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
            stack: err.stack,
          },
          statusCode: err.status,
          requestId,
          timestamp,
        },
        `AppError: ${err.message}`
      );

      const response: ErrorResponse = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          timestamp,
          requestId,
        },
      };

      return c.json(response, err.status);
    }

    if (err instanceof HTTPException) {
      logger.error(
        {
          error: {
            message: err.message,
            stack: err.stack,
            cause: err.cause,
          },
          statusCode: err.status,
          requestId,
          timestamp,
        },
        `HTTPException: ${err.message}`
      );

      return err.getResponse();
    }

    logger.error(
      {
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name,
        },
        statusCode: 500,
        requestId,
        timestamp,
      },
      `Unhandled error: ${err.message}`
    );

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        timestamp,
        requestId,
      },
    };

    return c.json(response, 500);
  };
}
