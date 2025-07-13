import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import { BlockService } from '../block/service';
import type {
  CreateFieldsRequestDto,
  CreateFieldsResponseDto,
  FieldRecord,
  FieldWithDataDto,
  FieldWithRelatedDataDto,
  PasswordFieldDataDto,
  TextFieldDataDto,
  TodoFieldDataDto,
} from './dto';
import {
  decryptPasswordFromStorage,
  encryptPasswordForStorage,
} from './password-encryption';
import { FieldRepository } from './repository';

export class FieldService {
  private repository: FieldRepository;
  private blockService: BlockService;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.repository = new FieldRepository(c);
    this.blockService = new BlockService(c);
    this.logger = getLogger(c, 'field-service');
  }

  private async getFieldDataByType(
    field: FieldRecord
  ): Promise<TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto> {
    switch (field.type) {
      case 'text': {
        const textData = await this.repository.findTextFieldData(field.uuid);
        if (!textData) {
          throw new ValidationError(
            `Text field data not found for field ${field.uuid}`
          );
        }
        return textData;
      }
      case 'password': {
        const passwordData = await this.repository.findPasswordFieldData(
          field.uuid
        );
        if (!passwordData) {
          throw new ValidationError(
            `Password field data not found for field ${field.uuid}`
          );
        }
        return passwordData;
      }
      case 'todo': {
        const todoData = await this.repository.findTodoFieldData(field.uuid);
        if (!todoData) {
          throw new ValidationError(
            `Todo field data not found for field ${field.uuid}`
          );
        }
        return todoData;
      }
      default:
        throw new ValidationError(`Unsupported field type: ${field.type}`);
    }
  }

  async createFields(
    input: CreateFieldsRequestDto,
    createdById: string
  ): Promise<CreateFieldsResponseDto> {
    this.logger.info(
      {
        fieldCount: input.fields.length,
        blockId: input.blockId,
        blockName: input.blockName,
        createdById,
      },
      'Attempting to create fields'
    );

    let targetBlockId: string;
    let createdBlock: CreateFieldsResponseDto['block'];

    // Determine target block - either existing or create new one
    if (input.blockId) {
      // Attach to existing block
      const existingBlock = await this.repository.findBlockByUuid(
        input.blockId
      );
      if (!existingBlock) {
        this.logger.warn(
          { blockId: input.blockId },
          'Field creation failed: target block not found'
        );
        throw new NotFoundError('Target block not found');
      }

      // Verify ownership
      if (existingBlock.createdById !== createdById) {
        this.logger.warn(
          {
            blockId: input.blockId,
            createdById,
            blockCreatedBy: existingBlock.createdById,
          },
          'Field creation failed: block ownership verification failed'
        );
        throw new ValidationError(
          'You can only add fields to blocks you created'
        );
      }

      // Verify block is terminal type
      if (existingBlock.blockType !== 'terminal') {
        this.logger.warn(
          { blockId: input.blockId, blockType: existingBlock.blockType },
          'Field creation failed: block is not terminal type'
        );
        throw new ValidationError(
          'Fields can only be added to terminal blocks'
        );
      }

      targetBlockId = existingBlock.uuid;
    } else if (input.blockName) {
      // Create new terminal block
      this.logger.info(
        { blockName: input.blockName, parentId: input.parentId },
        'Creating new terminal block for fields'
      );

      const blockResult = await this.blockService.createBlock(
        {
          name: input.blockName,
          description: input.blockDescription,
          parentId: input.parentId,
          blockType: 'terminal',
        },
        createdById
      );

      targetBlockId = blockResult.block.uuid;
      createdBlock = blockResult.block;

      this.logger.info(
        { blockId: targetBlockId, blockName: input.blockName },
        'Terminal block created successfully'
      );
    } else {
      throw new ValidationError('Either blockId or blockName must be provided');
    }

    // Create all fields in parallel
    const fieldCreationPromises = input.fields.map(async (fieldInput) => {
      this.logger.info(
        {
          fieldName: fieldInput.name,
          fieldType: fieldInput.type,
          targetBlockId,
        },
        'Creating field'
      );

      const fieldUuid = randomUUID();

      // Create field record
      const field = await this.repository.createField({
        uuid: fieldUuid,
        name: fieldInput.name,
        type: fieldInput.type,
        createdById,
        blockId: targetBlockId,
      });

      // Create type-specific field data
      let fieldData: TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto;

      switch (fieldInput.type) {
        case 'text': {
          const data = fieldInput.data as { text: string };
          fieldData = await this.repository.createTextFieldData({
            text: data.text,
            fieldId: fieldUuid,
          });
          break;
        }
        case 'password': {
          const data = fieldInput.data as { password: string };
          const encryptedPassword = encryptPasswordForStorage(data.password);
          const storedPasswordData =
            await this.repository.createPasswordFieldData({
              password: encryptedPassword,
              fieldId: fieldUuid,
            });
          // Always return decrypted password data to user, never the encrypted version
          fieldData = {
            ...storedPasswordData,
            password: data.password, // Return original plain text password
          };
          break;
        }
        case 'todo': {
          const data = fieldInput.data as { isChecked?: boolean };
          fieldData = await this.repository.createTodoFieldData({
            isChecked: data.isChecked ?? false,
            fieldId: fieldUuid,
          });
          break;
        }
        default:
          throw new ValidationError(
            `Unsupported field type: ${fieldInput.type}`
          );
      }

      this.logger.info(
        { fieldId: field.id, fieldUuid: field.uuid, fieldType: field.type },
        'Field created successfully'
      );

      return {
        ...field,
        data: fieldData,
      };
    });

    const createdFields = await Promise.all(fieldCreationPromises);

    this.logger.info(
      {
        createdFieldCount: createdFields.length,
        targetBlockId,
        newBlockCreated: !!createdBlock,
      },
      'Fields creation completed successfully'
    );

    return {
      fields: createdFields,
      block: createdBlock,
    };
  }

  private processFieldData(
    field: FieldWithRelatedDataDto
  ): TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto {
    switch (field.type) {
      case 'text': {
        if (!field.textField) {
          throw new ValidationError(
            `Text field data not found for field ${field.uuid}`
          );
        }
        return field.textField;
      }
      case 'password': {
        if (!field.passwordField) {
          throw new ValidationError(
            `Password field data not found for field ${field.uuid}`
          );
        }
        try {
          const decryptedPassword = decryptPasswordFromStorage(
            field.passwordField.password
          );
          return {
            ...field.passwordField,
            password: decryptedPassword,
          };
        } catch (error) {
          this.logger.error(
            {
              fieldId: field.uuid,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Failed to decrypt password for field'
          );
          throw new ValidationError('Failed to decrypt password field');
        }
      }
      case 'todo': {
        if (!field.todoField) {
          throw new ValidationError(
            `Todo field data not found for field ${field.uuid}`
          );
        }
        return field.todoField;
      }
      default:
        throw new ValidationError(`Unsupported field type: ${field.type}`);
    }
  }

  private mapFieldToDto(
    field: FieldWithRelatedDataDto,
    fieldData: TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto
  ): FieldWithDataDto {
    return {
      id: field.id,
      uuid: field.uuid,
      name: field.name,
      type: field.type,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
      createdById: field.createdById,
      blockId: field.blockId,
      data: fieldData,
    };
  }

  async getFieldsWithDecryptedPasswords(
    blockId: string,
    userId: string
  ): Promise<FieldWithDataDto[]> {
    this.logger.info(
      { blockId, userId },
      'Retrieving fields with decrypted passwords using optimized query'
    );

    // Verify block exists and user has access
    const block = await this.repository.findBlockByUuid(blockId);
    if (!block) {
      throw new NotFoundError('Block not found');
    }

    if (block.createdById !== userId) {
      throw new ValidationError(
        'You can only access fields from blocks you created'
      );
    }

    // Use optimized query to get all fields with their data in a single database operation
    const fieldsWithRelatedData =
      await this.repository.findFieldsWithDataByBlockId(blockId);

    // Process and decrypt passwords
    const fieldsWithDecryptedPasswords: FieldWithDataDto[] =
      fieldsWithRelatedData.map((field) => {
        const fieldData = this.processFieldData(field);
        return this.mapFieldToDto(field, fieldData);
      });

    this.logger.info(
      { blockId, fieldCount: fieldsWithDecryptedPasswords.length },
      'Fields with decrypted passwords retrieved successfully using optimized query'
    );

    return fieldsWithDecryptedPasswords;
  }

  async getFieldWithDecryptedPassword(
    fieldId: string,
    userId: string
  ): Promise<FieldWithDataDto | null> {
    this.logger.info(
      { fieldId, userId },
      'Retrieving field with decrypted password'
    );

    // Get field record first
    const field = await this.repository.findFieldByUuid(fieldId);

    if (!field) {
      return null;
    }

    // Get field data based on type
    const fieldData = await this.getFieldDataByType(field);

    const fieldWithData = {
      ...field,
      data: fieldData,
    };
    if (!fieldWithData) {
      return null;
    }

    // Verify ownership
    if (fieldWithData.createdById !== userId) {
      throw new ValidationError('You can only access fields you created');
    }

    // Decrypt password if it's a password field
    if (fieldWithData.type === 'password') {
      const passwordData = fieldWithData.data as PasswordFieldDataDto;
      try {
        const decryptedPassword = decryptPasswordFromStorage(
          passwordData.password
        );
        const decryptedFieldData = {
          ...fieldWithData,
          data: {
            ...passwordData,
            password: decryptedPassword,
          },
        };

        this.logger.info(
          { fieldId, fieldType: fieldWithData.type },
          'Field with decrypted password retrieved successfully'
        );

        return decryptedFieldData;
      } catch (error) {
        this.logger.error(
          {
            fieldId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to decrypt password for field'
        );
        throw new ValidationError('Failed to decrypt password field');
      }
    }

    this.logger.info(
      { fieldId, fieldType: fieldWithData.type },
      'Field retrieved successfully'
    );

    return fieldWithData;
  }
}
