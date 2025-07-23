import { eq } from 'drizzle-orm';
import { container, injectable } from 'tsyringe';
import { createDatabase } from '../../lib/database';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import {
  accounts,
  blocks,
  fields,
  passwordFields,
  textFields,
  todoFields,
} from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { BlockRecord, CreateBlockInput } from '../block/dto';
import type {
  CreateFieldInput,
  CreatePasswordFieldInput,
  CreateTextFieldInput,
  CreateTodoFieldInput,
  FieldRecord,
} from '../field/dto';

@injectable()
export default class DataTransferRepository {
  async getAllUserData(c: AppContext, userUuid: string) {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info({ userUuid }, 'Fetching all user data for export');

      // Get user info
      const user = await db
        .select({
          uuid: accounts.uuid,
          username: accounts.username,
        })
        .from(accounts)
        .where(eq(accounts.uuid, userUuid))
        .get();

      if (!user) {
        throw new DatabaseError('User not found');
      }

      // Get all user's blocks
      const userBlocks = await db
        .select()
        .from(blocks)
        .where(eq(blocks.createdById, userUuid));

      // Get all user's fields with their type-specific data
      const userFields = await db
        .select({
          field: fields,
          textField: textFields,
          passwordField: passwordFields,
          todoField: todoFields,
        })
        .from(fields)
        .leftJoin(textFields, eq(fields.uuid, textFields.fieldId))
        .leftJoin(passwordFields, eq(fields.uuid, passwordFields.fieldId))
        .leftJoin(todoFields, eq(fields.uuid, todoFields.fieldId))
        .where(eq(fields.createdById, userUuid));

      logger.info(
        {
          userUuid,
          blocksCount: userBlocks.length,
          fieldsCount: userFields.length,
        },
        'Successfully fetched user data for export'
      );

      return {
        user,
        blocks: userBlocks,
        fields: userFields,
      };
    } catch (error) {
      logger.error(
        {
          userUuid,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to fetch user data for export'
      );
      throw error instanceof DatabaseError
        ? error
        : new DatabaseError('Failed to fetch user data for export');
    }
  }

  async clearAllUserData(c: AppContext, userUuid: string): Promise<void> {
    const logger = getLogger(c, 'data-transfer-repository');
    const db = createDatabase(c);

    try {
      logger.info({ userUuid }, 'Clearing all user data');

      await db.transaction(async (tx) => {
        // Get all user's field UUIDs first
        const userFieldUuids = await tx
          .select({ uuid: fields.uuid })
          .from(fields)
          .where(eq(fields.createdById, userUuid));

        const fieldUuids = userFieldUuids.map((f) => f.uuid);

        if (fieldUuids.length > 0) {
          // Delete field type-specific data in parallel
          await Promise.all([
            ...fieldUuids.map((fieldUuid) =>
              tx.delete(textFields).where(eq(textFields.fieldId, fieldUuid))
            ),
            ...fieldUuids.map((fieldUuid) =>
              tx
                .delete(passwordFields)
                .where(eq(passwordFields.fieldId, fieldUuid))
            ),
            ...fieldUuids.map((fieldUuid) =>
              tx.delete(todoFields).where(eq(todoFields.fieldId, fieldUuid))
            ),
          ]);

          // Delete fields
          await tx.delete(fields).where(eq(fields.createdById, userUuid));
        }

        // Delete blocks
        await tx.delete(blocks).where(eq(blocks.createdById, userUuid));
      });

      logger.info({ userUuid }, 'Successfully cleared all user data');
    } catch (error) {
      logger.error(
        {
          userUuid,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to clear user data'
      );
      throw new DatabaseError('Failed to clear user data');
    }
  }

  async batchImportData(
    c: AppContext,
    blocksToCreate: CreateBlockInput[],
    fieldsToCreate: CreateFieldInput[],
    textFieldsToCreate: CreateTextFieldInput[],
    passwordFieldsToCreate: CreatePasswordFieldInput[],
    todoFieldsToCreate: CreateTodoFieldInput[]
  ): Promise<{
    createdBlocks: BlockRecord[];
    createdFields: FieldRecord[];
  }> {
    const logger = getLogger(c, 'data-transfer-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        {
          blocksCount: blocksToCreate.length,
          fieldsCount: fieldsToCreate.length,
          textFieldsCount: textFieldsToCreate.length,
          passwordFieldsCount: passwordFieldsToCreate.length,
          todoFieldsCount: todoFieldsToCreate.length,
        },
        'Starting batch import'
      );

      return await db.transaction(async (tx) => {
        // Create blocks and fields in batch
        const [createdBlocksResults, createdFieldsResults] = await Promise.all([
          blocksToCreate.length > 0
            ? tx.insert(blocks).values(blocksToCreate).returning()
            : Promise.resolve([]),
          fieldsToCreate.length > 0
            ? tx.insert(fields).values(fieldsToCreate).returning()
            : Promise.resolve([]),
        ]);

        const createdBlocks = createdBlocksResults as BlockRecord[];
        const createdFields = createdFieldsResults as FieldRecord[];

        // Create field type-specific data in parallel
        await Promise.all([
          textFieldsToCreate.length > 0
            ? tx.insert(textFields).values(textFieldsToCreate)
            : Promise.resolve(),
          passwordFieldsToCreate.length > 0
            ? tx.insert(passwordFields).values(passwordFieldsToCreate)
            : Promise.resolve(),
          todoFieldsToCreate.length > 0
            ? tx.insert(todoFields).values(todoFieldsToCreate)
            : Promise.resolve(),
        ]);

        logger.info(
          {
            createdBlocksCount: createdBlocks.length,
            createdFieldsCount: createdFields.length,
          },
          'Successfully completed batch import'
        );

        return { createdBlocks, createdFields };
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          blocksCount: blocksToCreate.length,
          fieldsCount: fieldsToCreate.length,
        },
        'Failed to complete batch import'
      );
      throw new DatabaseError('Failed to import data');
    }
  }

  async blockExists(c: AppContext, blockUuid: string): Promise<boolean> {
    const logger = getLogger(c, 'data-transfer-repository');
    const db = createDatabase(c);

    try {
      const result = await db
        .select({ uuid: blocks.uuid })
        .from(blocks)
        .where(eq(blocks.uuid, blockUuid))
        .get();

      return !!result;
    } catch (error) {
      logger.error(
        {
          blockUuid,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to check if block exists'
      );
      return false;
    }
  }
}

container.registerSingleton(DataTransferRepository);
