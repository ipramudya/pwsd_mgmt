import z from 'zod';
import { zValidator } from '../../lib/validator-wrapper';

const FIELD_NAME_MIN_LENGTH = 1;
const FIELD_NAME_MAX_LENGTH = 100;
const TEXT_MAX_LENGTH = 2000;
const PASSWORD_MAX_LENGTH = 500;
const BLOCK_NAME_MIN_LENGTH = 1;
const BLOCK_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const textFieldData = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(TEXT_MAX_LENGTH, `Text must not exceed ${TEXT_MAX_LENGTH} characters`)
    .trim(),
});

const passwordFieldData = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .max(
      PASSWORD_MAX_LENGTH,
      `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`
    ),
});

const todoFieldData = z.object({
  isChecked: z.boolean().optional().default(false),
});

const createField = z.object({
  name: z
    .string()
    .min(FIELD_NAME_MIN_LENGTH, 'Field name is required')
    .max(
      FIELD_NAME_MAX_LENGTH,
      `Field name must not exceed ${FIELD_NAME_MAX_LENGTH} characters`
    )
    .trim(),
  type: z.enum(['text', 'password', 'todo'], {
    required_error: 'Field type is required',
    invalid_type_error: 'Field type must be "text", "password", or "todo"',
  }),
  data: z.union([textFieldData, passwordFieldData, todoFieldData]),
});

const createFields = z
  .object({
    fields: z
      .array(createField)
      .min(1, 'At least one field is required')
      .max(50, 'Cannot create more than 50 fields at once'),
    blockId: z.string().uuid('Block ID must be a valid UUID').optional(),
    blockName: z
      .string()
      .min(
        BLOCK_NAME_MIN_LENGTH,
        'Block name is required when creating new block'
      )
      .max(
        BLOCK_NAME_MAX_LENGTH,
        `Block name must not exceed ${BLOCK_NAME_MAX_LENGTH} characters`
      )
      .trim()
      .optional(),
    blockDescription: z
      .string()
      .max(
        DESCRIPTION_MAX_LENGTH,
        `Block description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`
      )
      .trim()
      .optional(),
    parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
  })
  .refine(
    (data) => {
      // Either blockId is provided (attach to existing block) or blockName is provided (create new block)
      return !!(data.blockId || data.blockName);
    },
    {
      message:
        'Either blockId (for existing block) or blockName (for new block) must be provided',
      path: ['blockId'],
    }
  )
  .refine(
    (data) => {
      // Cannot provide both blockId and blockName
      return !(data.blockId && data.blockName);
    },
    {
      message: 'Cannot provide both blockId and blockName. Choose one.',
      path: ['blockId'],
    }
  );

export const fieldValidations = {
  createFields: zValidator(
    'json',
    createFields,
    'Field creation validation failed'
  ),
};
