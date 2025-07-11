import z from 'zod';
import { zValidator } from '../../lib/validator-wrapper';

const BLOCK_NAME_MIN_LENGTH = 1;
const BLOCK_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const createBlock = z.object({
  name: z
    .string()
    .min(BLOCK_NAME_MIN_LENGTH, 'Block name is required')
    .max(
      BLOCK_NAME_MAX_LENGTH,
      `Block name must not exceed ${BLOCK_NAME_MAX_LENGTH} characters`
    )
    .trim(),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`
    )
    .trim()
    .optional(),
  parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
  isFinal: z.boolean().optional().default(false),
});

const getBlocks = z.object({
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => {
      const num = Number.parseInt(val, 10);
      if (Number.isNaN(num) || num < 1 || num > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      return num;
    }),
  cursor: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name'])
    .optional()
    .default('createdAt'),
  deepLevel: z
    .string()
    .optional()
    .default('0')
    .transform((val) => {
      const num = Number.parseInt(val, 10);
      if (Number.isNaN(num) || num < 0) {
        throw new Error('Deep level must be a non-negative number');
      }
      return num;
    }),
});

export const blockValidations = {
  createBlock: zValidator(
    'json',
    createBlock,
    'Block creation validation failed'
  ),
  getBlocks: zValidator(
    'query',
    getBlocks,
    'Block retrieval validation failed'
  ),
};
