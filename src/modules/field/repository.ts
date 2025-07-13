import { and, eq, inArray } from 'drizzle-orm';
import { createDatabase, type Database } from '../../lib/database';
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

export class FieldRepository {
  private db: Database;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.db = createDatabase(c);
    this.logger = getLogger(c, 'field-repository');
  }

  async createField(input: CreateFieldInput): Promise<FieldRecord> {
    try {
      this.logger.info(
        {
          fieldName: input.name,
          fieldType: input.type,
          blockId: input.blockId,
        },
        'Creating field in database'
      );

      const [result] = await this.db
        .insert(fields)
        .values({
          uuid: input.uuid,
          name: input.name,
          type: input.type,
          createdById: input.createdById,
          blockId: input.blockId,
        })
        .returning();

      this.logger.info(
        { fieldId: result.id, fieldUuid: result.uuid },
        'Field created successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to create field');
      throw new DatabaseError('Failed to create field');
    }
  }

  async createTextFieldData(
    input: CreateTextFieldInput
  ): Promise<TextFieldRecord> {
    try {
      this.logger.info({ fieldId: input.fieldId }, 'Creating text field data');

      const [result] = await this.db
        .insert(textFields)
        .values({
          text: input.text,
          fieldId: input.fieldId,
        })
        .returning();

      this.logger.info(
        { textFieldId: result.id },
        'Text field data created successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to create text field data');
      throw new DatabaseError('Failed to create text field data');
    }
  }

  async createPasswordFieldData(
    input: CreatePasswordFieldInput
  ): Promise<PasswordFieldRecord> {
    try {
      this.logger.info(
        { fieldId: input.fieldId },
        'Creating password field data'
      );

      const [result] = await this.db
        .insert(passwordFields)
        .values({
          password: input.password,
          fieldId: input.fieldId,
        })
        .returning();

      this.logger.info(
        { passwordFieldId: result.id },
        'Password field data created successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to create password field data');
      throw new DatabaseError('Failed to create password field data');
    }
  }

  async createTodoFieldData(
    input: CreateTodoFieldInput
  ): Promise<TodoFieldRecord> {
    try {
      this.logger.info(
        { fieldId: input.fieldId, isChecked: input.isChecked },
        'Creating todo field data'
      );

      const [result] = await this.db
        .insert(todoFields)
        .values({
          isChecked: input.isChecked,
          fieldId: input.fieldId,
        })
        .returning();

      this.logger.info(
        { todoFieldId: result.id },
        'Todo field data created successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to create todo field data');
      throw new DatabaseError('Failed to create todo field data');
    }
  }

  async findFieldsByBlockId(blockId: string): Promise<FieldRecord[]> {
    try {
      this.logger.info({ blockId }, 'Finding fields by block ID');

      const result = await this.db
        .select()
        .from(fields)
        .where(eq(fields.blockId, blockId));

      this.logger.info(
        { blockId, fieldCount: result.length },
        'Fields retrieved successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to find fields by block ID');
      throw new DatabaseError('Failed to retrieve fields');
    }
  }

  async findTextFieldData(fieldId: string): Promise<TextFieldRecord | null> {
    try {
      const [result] = await this.db
        .select()
        .from(textFields)
        .where(eq(textFields.fieldId, fieldId))
        .limit(1);

      return result || null;
    } catch (error) {
      this.logger.error(error, 'Failed to find text field data');
      throw new DatabaseError('Failed to retrieve text field data');
    }
  }

  async findPasswordFieldData(
    fieldId: string
  ): Promise<PasswordFieldRecord | null> {
    try {
      const [result] = await this.db
        .select()
        .from(passwordFields)
        .where(eq(passwordFields.fieldId, fieldId))
        .limit(1);

      return result || null;
    } catch (error) {
      this.logger.error(error, 'Failed to find password field data');
      throw new DatabaseError('Failed to retrieve password field data');
    }
  }

  async findTodoFieldData(fieldId: string): Promise<TodoFieldRecord | null> {
    try {
      const [result] = await this.db
        .select()
        .from(todoFields)
        .where(eq(todoFields.fieldId, fieldId))
        .limit(1);

      return result || null;
    } catch (error) {
      this.logger.error(error, 'Failed to find todo field data');
      throw new DatabaseError('Failed to retrieve todo field data');
    }
  }

  async findBlockByUuid(uuid: string) {
    try {
      this.logger.info({ blockUuid: uuid }, 'Finding block by UUID');

      const [result] = await this.db
        .select()
        .from(blocks)
        .where(eq(blocks.uuid, uuid))
        .limit(1);

      if (!result) {
        this.logger.warn({ blockUuid: uuid }, 'Block not found');
        return null;
      }

      this.logger.info(
        { blockId: result.id, blockUuid: result.uuid },
        'Block found successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to find block by UUID');
      throw new DatabaseError('Failed to find block');
    }
  }

  async findFieldByUuid(fieldId: string): Promise<FieldRecord | null> {
    try {
      this.logger.info({ fieldId }, 'Finding field by UUID');

      const [result] = await this.db
        .select()
        .from(fields)
        .where(eq(fields.uuid, fieldId))
        .limit(1);

      if (!result) {
        this.logger.warn({ fieldId }, 'Field not found');
        return null;
      }

      this.logger.info(
        { fieldId, fieldType: result.type },
        'Field found successfully'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to find field by UUID');
      throw new DatabaseError('Failed to find field');
    }
  }

  async findFieldsWithDataByBlockId(blockId: string) {
    try {
      this.logger.info(
        { blockId },
        'Finding fields with data by block ID using optimized query'
      );

      const result = await this.db.query.fields.findMany({
        where: eq(fields.blockId, blockId),
        with: {
          textField: true,
          passwordField: true,
          todoField: true,
        },
      });

      this.logger.info(
        { blockId, fieldCount: result.length },
        'Fields with data found successfully using optimized query'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to find fields with data by block ID');
      throw new DatabaseError('Failed to retrieve fields with data');
    }
  }

  async findFieldsByIdsAndBlockId(
    fieldIds: string[],
    blockId: string
  ): Promise<FieldRecord[]> {
    try {
      this.logger.info(
        { fieldIds, blockId },
        'Finding fields by IDs and block ID'
      );

      const result = await this.db
        .select()
        .from(fields)
        .where(
          and(inArray(fields.uuid, fieldIds), eq(fields.blockId, blockId))
        );

      this.logger.info(
        { foundCount: result.length, expectedCount: fieldIds.length },
        'Fields found by IDs and block ID'
      );

      return result;
    } catch (error) {
      this.logger.error(error, 'Failed to find fields by IDs and block ID');
      throw new DatabaseError('Failed to retrieve fields');
    }
  }

  async updateTextFieldData(fieldId: string, text: string): Promise<void> {
    try {
      this.logger.info({ fieldId }, 'Updating text field data');

      await this.db
        .update(textFields)
        .set({ text, updatedAt: new Date() })
        .where(eq(textFields.fieldId, fieldId));

      this.logger.info({ fieldId }, 'Text field data updated successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to update text field data');
      throw new DatabaseError('Failed to update text field data');
    }
  }

  async updatePasswordFieldData(
    fieldId: string,
    encryptedPassword: string
  ): Promise<void> {
    try {
      this.logger.info({ fieldId }, 'Updating password field data');

      await this.db
        .update(passwordFields)
        .set({ password: encryptedPassword, updatedAt: new Date() })
        .where(eq(passwordFields.fieldId, fieldId));

      this.logger.info({ fieldId }, 'Password field data updated successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to update password field data');
      throw new DatabaseError('Failed to update password field data');
    }
  }

  async updateTodoFieldData(
    fieldId: string,
    isChecked: boolean
  ): Promise<void> {
    try {
      this.logger.info({ fieldId, isChecked }, 'Updating todo field data');

      await this.db
        .update(todoFields)
        .set({ isChecked, updatedAt: new Date() })
        .where(eq(todoFields.fieldId, fieldId));

      this.logger.info({ fieldId }, 'Todo field data updated successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to update todo field data');
      throw new DatabaseError('Failed to update todo field data');
    }
  }

  async deleteTextFieldData(fieldId: string): Promise<void> {
    try {
      this.logger.info({ fieldId }, 'Deleting text field data');

      await this.db.delete(textFields).where(eq(textFields.fieldId, fieldId));

      this.logger.info({ fieldId }, 'Text field data deleted successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to delete text field data');
      throw new DatabaseError('Failed to delete text field data');
    }
  }

  async deletePasswordFieldData(fieldId: string): Promise<void> {
    try {
      this.logger.info({ fieldId }, 'Deleting password field data');

      await this.db
        .delete(passwordFields)
        .where(eq(passwordFields.fieldId, fieldId));

      this.logger.info({ fieldId }, 'Password field data deleted successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to delete password field data');
      throw new DatabaseError('Failed to delete password field data');
    }
  }

  async deleteTodoFieldData(fieldId: string): Promise<void> {
    try {
      this.logger.info({ fieldId }, 'Deleting todo field data');

      await this.db.delete(todoFields).where(eq(todoFields.fieldId, fieldId));

      this.logger.info({ fieldId }, 'Todo field data deleted successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to delete todo field data');
      throw new DatabaseError('Failed to delete todo field data');
    }
  }

  async deleteField(fieldId: string): Promise<void> {
    try {
      this.logger.info({ fieldId }, 'Deleting field record');

      await this.db.delete(fields).where(eq(fields.uuid, fieldId));

      this.logger.info({ fieldId }, 'Field record deleted successfully');
    } catch (error) {
      this.logger.error(error, 'Failed to delete field record');
      throw new DatabaseError('Failed to delete field record');
    }
  }
}
