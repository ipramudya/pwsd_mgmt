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
  blockType: z.enum(['container', 'terminal'], {
    required_error: 'Block type is required',
    invalid_type_error: 'Block type must be either "container" or "terminal"',
  }),
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
    .enum(['createdAt', 'updatedAt', 'name', 'blockType'])
    .optional()
    .default('createdAt'),
  parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
});

const updateBlock = z.object({
  name: z
    .string()
    .min(BLOCK_NAME_MIN_LENGTH, 'Block name is required')
    .max(
      BLOCK_NAME_MAX_LENGTH,
      `Block name must not exceed ${BLOCK_NAME_MAX_LENGTH} characters`
    )
    .trim()
    .optional(),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`
    )
    .trim()
    .optional(),
});

const moveBlock = z.object({
  targetParentId: z
    .string()
    .uuid('Target parent ID must be a valid UUID')
    .optional(),
});

const deleteBlock = z.object({
  confirmationName: z.string().min(1, 'Confirmation name is required'),
});

const recentBlocks = z.object({
  days: z
    .string()
    .optional()
    .default('7')
    .transform((val) => {
      const num = Number.parseInt(val, 10);
      if (Number.isNaN(num) || num < 1 || num > 30) {
        throw new Error('Days must be between 1 and 30');
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
  updateBlock: zValidator(
    'json',
    updateBlock,
    'Block update validation failed'
  ),
  moveBlock: zValidator('json', moveBlock, 'Block move validation failed'),
  deleteBlock: zValidator(
    'json',
    deleteBlock,
    'Block deletion validation failed'
  ),
  recentBlocks: zValidator(
    'query',
    recentBlocks,
    'Recent blocks validation failed'
  ),
};
