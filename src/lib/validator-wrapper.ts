import { zValidator as zv } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import type { ValidationTargets } from 'hono/types';
import type { ZodSchema } from 'zod';

// Custom error response interface
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    type: 'validation' | 'server' | 'auth';
    message: string;
    details?: ValidationError[];
  };
}

// Helper function to format Zod errors
export function formatZodErrors(error: unknown): ErrorResponse {
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as {
      issues: Array<{ path: string[]; message: string; code: string }>;
    };
    const validationErrors: ValidationError[] = zodError.issues.map(
      (issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })
    );

    return {
      success: false,
      error: {
        type: 'validation',
        message: 'Validation failed',
        details: validationErrors,
      },
    };
  }

  return {
    success: false,
    error: {
      type: 'validation',
      message: 'Validation failed',
      details: [],
    },
  };
}

export const zValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
  errorMessage = 'Validation failed'
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      const formattedError = formatZodErrors(result.error);
      formattedError.error.message = errorMessage;

      throw new HTTPException(400, {
        message: JSON.stringify(formattedError),
        cause: result.error,
      });
    }
  });
