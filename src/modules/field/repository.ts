import { and, eq, inArray } from 'drizzle-orm';
import { container, injectable } from 'tsyringe';
import { createDatabase } from '../../lib/database';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import {
  blocks,
  fields,
  passwordFields,
  textFields,
  todoFields,
} from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { BlockRecord } from '../block/dto';
import type {
  CreateFieldInput,
  CreatePasswordFieldInput,
  CreateTextFieldInput,
  CreateTodoFieldInput,
  FieldRecord,
  PasswordFieldRecord,
  TextFieldRecord,
  TodoFieldRecord,
} from './dto';

@injectable()
export default class FieldRepository {
  async createField(
    c: AppContext,
    input: CreateFieldInput
  ): Promise<FieldRecord> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        {
          fieldName: input.name,
          fieldType: input.type,
          blockId: input.blockId,
        },
        'Creating field in database'
      );

      const [result] = await db
        .insert(fields)
        .values({
          uuid: input.uuid,
          name: input.name,
          type: input.type,
          createdById: input.createdById,
          blockId: input.blockId,
        })
        .returning();

      logger.info(
        { fieldId: result.id, fieldUuid: result.uuid },
        'Field created successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to create field');
      throw new DatabaseError('Failed to create field');
    }
  }

  async createTextFieldData(
    c: AppContext,
    input: CreateTextFieldInput
  ): Promise<TextFieldRecord> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId: input.fieldId }, 'Creating text field data');

      const [result] = await db
        .insert(textFields)
        .values({
          text: input.text,
          fieldId: input.fieldId,
        })
        .returning();

      logger.info(
        { textFieldId: result.id },
        'Text field data created successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to create text field data');
      throw new DatabaseError('Failed to create text field data');
    }
  }

  async createPasswordFieldData(
    c: AppContext,
    input: CreatePasswordFieldInput
  ): Promise<PasswordFieldRecord> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId: input.fieldId }, 'Creating password field data');

      const [result] = await db
        .insert(passwordFields)
        .values({
          password: input.password,
          fieldId: input.fieldId,
        })
        .returning();

      logger.info(
        { passwordFieldId: result.id },
        'Password field data created successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to create password field data');
      throw new DatabaseError('Failed to create password field data');
    }
  }

  async createTodoFieldData(
    c: AppContext,
    input: CreateTodoFieldInput
  ): Promise<TodoFieldRecord> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        { fieldId: input.fieldId, isChecked: input.isChecked },
        'Creating todo field data'
      );

      const [result] = await db
        .insert(todoFields)
        .values({
          isChecked: input.isChecked,
          fieldId: input.fieldId,
        })
        .returning();

      logger.info(
        { todoFieldId: result.id },
        'Todo field data created successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to create todo field data');
      throw new DatabaseError('Failed to create todo field data');
    }
  }

  async findFieldsByBlockId(
    c: AppContext,
    blockId: string
  ): Promise<FieldRecord[]> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ blockId }, 'Finding fields by block ID');

      const result = await db
        .select()
        .from(fields)
        .where(eq(fields.blockId, blockId));

      logger.info(
        { blockId, fieldCount: result.length },
        'Fields retrieved successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to find fields by block ID');
      throw new DatabaseError('Failed to retrieve fields');
    }
  }

  async findTextFieldData(
    c: AppContext,
    fieldId: string
  ): Promise<TextFieldRecord | null> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      const [result] = await db
        .select()
        .from(textFields)
        .where(eq(textFields.fieldId, fieldId))
        .limit(1);

      return result || null;
    } catch (error) {
      logger.error(error, 'Failed to find text field data');
      throw new DatabaseError('Failed to retrieve text field data');
    }
  }

  async findPasswordFieldData(
    c: AppContext,
    fieldId: string
  ): Promise<PasswordFieldRecord | null> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      const [result] = await db
        .select()
        .from(passwordFields)
        .where(eq(passwordFields.fieldId, fieldId))
        .limit(1);

      return result || null;
    } catch (error) {
      logger.error(error, 'Failed to find password field data');
      throw new DatabaseError('Failed to retrieve password field data');
    }
  }

  async findTodoFieldData(
    c: AppContext,
    fieldId: string
  ): Promise<TodoFieldRecord | null> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      const [result] = await db
        .select()
        .from(todoFields)
        .where(eq(todoFields.fieldId, fieldId))
        .limit(1);

      return result || null;
    } catch (error) {
      logger.error(error, 'Failed to find todo field data');
      throw new DatabaseError('Failed to retrieve todo field data');
    }
  }

  async findBlockByUuid(
    c: AppContext,
    uuid: string
  ): Promise<BlockRecord | null> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ blockUuid: uuid }, 'Finding block by UUID');

      const [result] = await db
        .select()
        .from(blocks)
        .where(eq(blocks.uuid, uuid))
        .limit(1);

      if (!result) {
        logger.warn({ blockUuid: uuid }, 'Block not found');
        return null;
      }

      logger.info(
        { blockId: result.id, blockUuid: result.uuid },
        'Block found successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to find block by UUID');
      throw new DatabaseError('Failed to find block');
    }
  }

  async findFieldByUuid(
    c: AppContext,
    fieldId: string
  ): Promise<FieldRecord | null> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Finding field by UUID');

      const [result] = await db
        .select()
        .from(fields)
        .where(eq(fields.uuid, fieldId))
        .limit(1);

      if (!result) {
        logger.warn({ fieldId }, 'Field not found');
        return null;
      }

      logger.info(
        { fieldId, fieldType: result.type },
        'Field found successfully'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to find field by UUID');
      throw new DatabaseError('Failed to find field');
    }
  }

  async findFieldsWithDataByBlockId(
    c: AppContext,
    blockId: string
  ): Promise<FieldRecord[]> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        { blockId },
        'Finding fields with data by block ID using optimized query'
      );

      const result = await db.query.fields.findMany({
        where: eq(fields.blockId, blockId),
        with: {
          textField: true,
          passwordField: true,
          todoField: true,
        },
      });

      logger.info(
        { blockId, fieldCount: result.length },
        'Fields with data found successfully using optimized query'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to find fields with data by block ID');
      throw new DatabaseError('Failed to retrieve fields with data');
    }
  }

  async findFieldsByIdsAndBlockId(
    c: AppContext,
    fieldIds: string[],
    blockId: string
  ): Promise<FieldRecord[]> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldIds, blockId }, 'Finding fields by IDs and block ID');

      const result = await db
        .select()
        .from(fields)
        .where(
          and(inArray(fields.uuid, fieldIds), eq(fields.blockId, blockId))
        );

      logger.info(
        { foundCount: result.length, expectedCount: fieldIds.length },
        'Fields found by IDs and block ID'
      );

      return result;
    } catch (error) {
      logger.error(error, 'Failed to find fields by IDs and block ID');
      throw new DatabaseError('Failed to retrieve fields');
    }
  }

  async updateTextFieldData(
    c: AppContext,
    fieldId: string,
    text: string
  ): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Updating text field data');
      await db
        .update(textFields)
        .set({ text, updatedAt: new Date() })
        .where(eq(textFields.fieldId, fieldId));

      logger.info({ fieldId }, 'Text field data updated successfully');
    } catch (error) {
      logger.error(error, 'Failed to update text field data');
      throw new DatabaseError('Failed to update text field data');
    }
  }

  async updatePasswordFieldData(
    c: AppContext,
    fieldId: string,
    encryptedPassword: string
  ): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Updating password field data');

      await db
        .update(passwordFields)
        .set({ password: encryptedPassword, updatedAt: new Date() })
        .where(eq(passwordFields.fieldId, fieldId));

      logger.info({ fieldId }, 'Password field data updated successfully');
    } catch (error) {
      logger.error(error, 'Failed to update password field data');
      throw new DatabaseError('Failed to update password field data');
    }
  }

  async updateTodoFieldData(
    c: AppContext,
    fieldId: string,
    isChecked: boolean
  ): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId, isChecked }, 'Updating todo field data');

      await db
        .update(todoFields)
        .set({ isChecked, updatedAt: new Date() })
        .where(eq(todoFields.fieldId, fieldId));

      logger.info({ fieldId }, 'Todo field data updated successfully');
    } catch (error) {
      logger.error(error, 'Failed to update todo field data');
      throw new DatabaseError('Failed to update todo field data');
    }
  }

  async updateFieldMetadata(
    c: AppContext,
    fieldId: string,
    updates: { name?: string; type?: string }
  ): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId, updates }, 'Updating field metadata');

      const updateData: { name?: string; type?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }

      if (updates.type !== undefined) {
        updateData.type = updates.type;
      }

      await db
        .update(fields)
        .set(updateData)
        .where(eq(fields.uuid, fieldId));

      logger.info({ fieldId }, 'Field metadata updated successfully');
    } catch (error) {
      logger.error(error, 'Failed to update field metadata');
      throw new DatabaseError('Failed to update field metadata');
    }
  }

  async deleteTextFieldData(c: AppContext, fieldId: string): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Deleting text field data');

      await db.delete(textFields).where(eq(textFields.fieldId, fieldId));

      logger.info({ fieldId }, 'Text field data deleted successfully');
    } catch (error) {
      logger.error(error, 'Failed to delete text field data');
      throw new DatabaseError('Failed to delete text field data');
    }
  }

  async deletePasswordFieldData(c: AppContext, fieldId: string): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Deleting password field data');

      await db
        .delete(passwordFields)
        .where(eq(passwordFields.fieldId, fieldId));

      logger.info({ fieldId }, 'Password field data deleted successfully');
    } catch (error) {
      logger.error(error, 'Failed to delete password field data');
      throw new DatabaseError('Failed to delete password field data');
    }
  }

  async deleteTodoFieldData(c: AppContext, fieldId: string): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Deleting todo field data');

      await db.delete(todoFields).where(eq(todoFields.fieldId, fieldId));

      logger.info({ fieldId }, 'Todo field data deleted successfully');
    } catch (error) {
      logger.error(error, 'Failed to delete todo field data');
      throw new DatabaseError('Failed to delete todo field data');
    }
  }

  async deleteField(c: AppContext, fieldId: string): Promise<void> {
    const logger = getLogger(c, 'field-repository');
    const db = createDatabase(c);

    try {
      logger.info({ fieldId }, 'Deleting field record');

      await db.delete(fields).where(eq(fields.uuid, fieldId));

      logger.info({ fieldId }, 'Field record deleted successfully');
    } catch (error) {
      logger.error(error, 'Failed to delete field record');
      throw new DatabaseError('Failed to delete field record');
    }
  }
}

container.registerSingleton(FieldRepository);
