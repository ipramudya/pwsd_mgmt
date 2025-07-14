import z from 'zod';
import { zValidator } from '../../lib/validator-wrapper';

const QUERY_MIN_LENGTH = 1;
const QUERY_MAX_LENGTH = 200;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const searchQuery = z.object({
  query: z
    .string()
    .min(QUERY_MIN_LENGTH, 'Search query is required')
    .max(
      QUERY_MAX_LENGTH,
      `Search query must not exceed ${QUERY_MAX_LENGTH} characters`
    )
    .trim(),
  blockType: z
    .enum(['container', 'terminal', 'all'], {
      invalid_type_error:
        'Block type must be "container", "terminal", or "all"',
    })
    .optional()
    .default('all'),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(MAX_LIMIT, `Limit must not exceed ${MAX_LIMIT}`)
    .optional()
    .default(DEFAULT_LIMIT),
  cursor: z.string().min(1, 'Cursor cannot be empty').optional(),
  sort: z
    .enum(['asc', 'desc'], {
      invalid_type_error: 'Sort order must be "asc" or "desc"',
    })
    .optional()
    .default('desc'),
  sortBy: z
    .enum(['relevance', 'name', 'createdAt', 'updatedAt'], {
      invalid_type_error:
        'Sort field must be "relevance", "name", "createdAt", or "updatedAt"',
    })
    .optional()
    .default('relevance'),
});

export const searchValidations = {
  search: zValidator('query', searchQuery, 'Search validation failed'),
};
