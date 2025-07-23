import { randomUUID } from 'node:crypto';
import { container, delay, inject, injectable } from 'tsyringe';
import { NotFoundError, ValidationError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import BlockService from '../block/service.di';
import type {
  CreateFieldsRequestDto,
  CreateFieldsResponseDto,
  DeleteFieldsRequestDto,
  DeleteFieldsResponseDto,
  FieldRecord,
  FieldWithDataDto,
  FieldWithRelatedDataDto,
  PasswordFieldDataDto,
  TextFieldDataDto,
  TodoFieldDataDto,
  UpdateFieldsRequestDto,
  UpdateFieldsResponseDto,
} from './dto';
import {
  decryptPasswordFromStorage,
  encryptPasswordForStorage,
} from './password-encryption';
import FieldRepository from './repository.di';

@injectable()
export default class FieldService {
  constructor(
    @inject(FieldRepository)
    private readonly repository: FieldRepository,
    @inject(delay(() => BlockService))
    private readonly blockService: BlockService
  ) {}

  async createFields(
    c: AppContext,
    input: CreateFieldsRequestDto,
    createdById: string
  ): Promise<CreateFieldsResponseDto> {
    const logger = getLogger(c, 'field-service');

    logger.info(
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
        c,
        input.blockId
      );
      if (!existingBlock) {
        logger.warn(
          { blockId: input.blockId },
          'Field creation failed: target block not found'
        );
        throw new NotFoundError('Target block not found');
      }

      // Verify ownership
      if (existingBlock.createdById !== createdById) {
        logger.warn(
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
        logger.warn(
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
      logger.info(
        { blockName: input.blockName, parentId: input.parentId },
        'Creating new terminal block for fields'
      );

      const blockResult = await this.blockService.createBlock(
        c,
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

      logger.info(
        { blockId: targetBlockId, blockName: input.blockName },
        'Terminal block created successfully'
      );
    } else {
      throw new ValidationError('Either blockId or blockName must be provided');
    }

    // Create all fields in parallel
    const fieldCreationPromises = input.fields.map(async (fieldInput) => {
      logger.info(
        {
          fieldName: fieldInput.name,
          fieldType: fieldInput.type,
          targetBlockId,
        },
        'Creating field'
      );

      const fieldUuid = randomUUID();

      // Create field record
      const field = await this.repository.createField(c, {
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
          fieldData = await this.repository.createTextFieldData(c, {
            text: data.text,
            fieldId: fieldUuid,
          });
          break;
        }
        case 'password': {
          const data = fieldInput.data as { password: string };
          const encryptedPassword = encryptPasswordForStorage(data.password);
          const storedPasswordData =
            await this.repository.createPasswordFieldData(c, {
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
          fieldData = await this.repository.createTodoFieldData(c, {
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

      logger.info(
        { fieldId: field.id, fieldUuid: field.uuid, fieldType: field.type },
        'Field created successfully'
      );

      return {
        ...field,
        data: fieldData,
      };
    });

    const createdFields = await Promise.all(fieldCreationPromises);

    logger.info(
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

  async getFieldsWithDecryptedPasswords(
    c: AppContext,
    blockId: string,
    userId: string
  ): Promise<FieldWithDataDto[]> {
    const logger = getLogger(c, 'field-service');

    logger.info(
      { blockId, userId },
      'Retrieving fields with decrypted passwords using optimized query'
    );

    // Verify block exists and user has access
    const block = await this.repository.findBlockByUuid(c, blockId);
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
      await this.repository.findFieldsWithDataByBlockId(c, blockId);

    // Process and decrypt passwords
    const fieldsWithDecryptedPasswords: FieldWithDataDto[] =
      fieldsWithRelatedData.map((field) => {
        const fieldData = this.processFieldData(c, field);
        return this.mapFieldToDto(field, fieldData);
      });

    logger.info(
      { blockId, fieldCount: fieldsWithDecryptedPasswords.length },
      'Fields with decrypted passwords retrieved successfully using optimized query'
    );

    return fieldsWithDecryptedPasswords;
  }

  async getFieldWithDecryptedPassword(
    c: AppContext,
    fieldId: string,
    userId: string
  ): Promise<FieldWithDataDto | null> {
    const logger = getLogger(c, 'field-service');

    logger.info(
      { fieldId, userId },
      'Retrieving field with decrypted password'
    );

    // Get field record first
    const field = await this.repository.findFieldByUuid(c, fieldId);

    if (!field) {
      return null;
    }

    // Get field data based on type
    const fieldData = await this.getFieldDataByType(c, field);

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

        logger.info(
          { fieldId, fieldType: fieldWithData.type },
          'Field with decrypted password retrieved successfully'
        );

        return decryptedFieldData;
      } catch (error) {
        logger.error(
          {
            fieldId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to decrypt password for field'
        );
        throw new ValidationError('Failed to decrypt password field');
      }
    }

    logger.info(
      { fieldId, fieldType: fieldWithData.type },
      'Field retrieved successfully'
    );

    return fieldWithData;
  }

  async updateFields(
    c: AppContext,
    blockId: string,
    input: UpdateFieldsRequestDto,
    userId: string
  ): Promise<UpdateFieldsResponseDto> {
    const logger = getLogger(c, 'field-service');

    logger.info(
      {
        blockId,
        fieldCount: input.fields.length,
        userId,
      },
      'Attempting to update fields'
    );

    // Verify block exists and user has access
    const block = await this.repository.findBlockByUuid(c, blockId);
    if (!block) {
      throw new NotFoundError('Block not found');
    }

    if (block.createdById !== userId) {
      throw new ValidationError(
        'You can only update fields in blocks you created'
      );
    }

    if (block.blockType !== 'terminal') {
      throw new ValidationError('Can only update fields in terminal blocks');
    }

    // Extract field IDs and verify they belong to the block and user
    const fieldIds = input.fields.map((f) => f.fieldId);
    const fieldsToUpdate = await this.repository.findFieldsByIdsAndBlockId(
      c,
      fieldIds,
      blockId
    );

    if (fieldsToUpdate.length !== fieldIds.length) {
      throw new NotFoundError(
        'One or more fields not found in the specified block'
      );
    }

    // Verify all fields belong to the user
    const invalidFields = fieldsToUpdate.filter(
      (field) => field.createdById !== userId
    );
    if (invalidFields.length > 0) {
      throw new ValidationError('You can only update fields you created');
    }

    // Perform batch updates with transaction-like behavior
    const updatePromises = input.fields.map(async (fieldUpdate) => {
      const field = fieldsToUpdate.find((f) => f.uuid === fieldUpdate.fieldId);
      if (!field) {
        throw new NotFoundError(`Field ${fieldUpdate.fieldId} not found`);
      }

      logger.info(
        {
          fieldId: field.uuid,
          fieldType: field.type,
        },
        'Updating field data'
      );

      // Update the field data based on type
      switch (field.type) {
        case 'text': {
          const data = fieldUpdate.data as { text: string };
          await this.repository.updateTextFieldData(c, field.uuid, data.text);
          break;
        }
        case 'password': {
          const data = fieldUpdate.data as { password: string };
          const encryptedPassword = encryptPasswordForStorage(data.password);
          await this.repository.updatePasswordFieldData(
            c,
            field.uuid,
            encryptedPassword
          );
          break;
        }
        case 'todo': {
          const data = fieldUpdate.data as { isChecked: boolean };
          await this.repository.updateTodoFieldData(
            c,
            field.uuid,
            data.isChecked
          );
          break;
        }
        default:
          throw new ValidationError(`Unsupported field type: ${field.type}`);
      }

      // Return the updated field with its data
      return this.getFieldWithDecryptedPassword(c, field.uuid, userId);
    });

    const updatedFields = await Promise.all(updatePromises);
    const validUpdatedFields = updatedFields.filter(
      (field): field is FieldWithDataDto => field !== null
    );

    logger.info(
      {
        blockId,
        updatedFieldCount: validUpdatedFields.length,
      },
      'Fields updated successfully'
    );

    return {
      updatedFields: validUpdatedFields,
    };
  }

  async deleteFields(
    c: AppContext,
    blockId: string,
    input: DeleteFieldsRequestDto,
    userId: string
  ): Promise<DeleteFieldsResponseDto> {
    const logger = getLogger(c, 'field-service');

    logger.info(
      {
        blockId,
        fieldIds: input.fieldIds,
        userId,
      },
      'Attempting to delete fields'
    );

    // Verify block exists and user has access
    const block = await this.repository.findBlockByUuid(c, blockId);
    if (!block) {
      throw new NotFoundError('Block not found');
    }

    if (block.createdById !== userId) {
      throw new ValidationError(
        'You can only delete fields from blocks you created'
      );
    }

    if (block.blockType !== 'terminal') {
      throw new ValidationError('Can only delete fields from terminal blocks');
    }

    // Verify all fields exist and belong to the block and user
    const fieldsToDelete = await this.repository.findFieldsByIdsAndBlockId(
      c,
      input.fieldIds,
      blockId
    );

    if (fieldsToDelete.length !== input.fieldIds.length) {
      throw new NotFoundError(
        'One or more fields not found in the specified block'
      );
    }

    // Verify all fields belong to the user
    const invalidFields = fieldsToDelete.filter(
      (field) => field.createdById !== userId
    );
    if (invalidFields.length > 0) {
      throw new ValidationError('You can only delete fields you created');
    }

    // Perform cascade deletion
    const deletionPromises = fieldsToDelete.map(async (field) => {
      logger.info(
        {
          fieldId: field.uuid,
          fieldType: field.type,
        },
        'Deleting field and its data'
      );

      // Delete field-specific data first, then the field record
      switch (field.type) {
        case 'text':
          await this.repository.deleteTextFieldData(c, field.uuid);
          break;
        case 'password':
          await this.repository.deletePasswordFieldData(c, field.uuid);
          break;
        case 'todo':
          await this.repository.deleteTodoFieldData(c, field.uuid);
          break;
        default:
          logger.warn(
            { fieldType: field.type },
            'Unknown field type during deletion'
          );
      }

      // Delete the field record
      await this.repository.deleteField(c, field.uuid);
      return field.uuid;
    });

    const deletedFieldIds = await Promise.all(deletionPromises);

    logger.info(
      {
        blockId,
        deletedCount: deletedFieldIds.length,
        deletedFieldIds,
      },
      'Fields deleted successfully'
    );

    return {
      deletedCount: deletedFieldIds.length,
      deletedFieldIds,
    };
  }

  private async getFieldDataByType(
    c: AppContext,
    field: FieldRecord
  ): Promise<TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto> {
    switch (field.type) {
      case 'text': {
        const textData = await this.repository.findTextFieldData(c, field.uuid);
        if (!textData) {
          throw new ValidationError(
            `Text field data not found for field ${field.uuid}`
          );
        }
        return textData;
      }
      case 'password': {
        const passwordData = await this.repository.findPasswordFieldData(
          c,
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
        const todoData = await this.repository.findTodoFieldData(c, field.uuid);
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

  private processFieldData(
    c: AppContext,
    field: FieldWithRelatedDataDto
  ): TextFieldDataDto | PasswordFieldDataDto | TodoFieldDataDto {
    const logger = getLogger(c, 'field-service');

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
          logger.error(
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
}

container.registerSingleton(FieldService);
