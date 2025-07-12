import { eq } from 'drizzle-orm';
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
}
