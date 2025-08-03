import { eq, sql } from 'drizzle-orm';
import { container, injectable } from 'tsyringe';
import { createDatabase } from '../../lib/database';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { accounts } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { AccountRecord, CreateAccountInput } from './dto';

@injectable()
export default class AuthRepository {
  async createAccount(c: AppContext, input: CreateAccountInput): Promise<void> {
    const logger = getLogger(c, 'auth-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        { uuid: input.uuid, username: input.username },
        'Creating account'
      );
      await db.insert(accounts).values({
        uuid: input.uuid,
        username: input.username,
        password: input.password,
      });
      logger.info(
        { uuid: input.uuid, username: input.username },
        'Account created successfully'
      );
    } catch (error) {
      logger.error(
        { uuid: input.uuid, username: input.username, error },
        'Failed to create account'
      );
      throw new DatabaseError('Failed to create account', { error });
    }
  }

  async findAccountByUsername(
    c: AppContext,
    username: string
  ): Promise<AccountRecord | null> {
    const logger = getLogger(c, 'auth-repository');
    const db = createDatabase(c);

    try {
      logger.info({ username }, 'Finding account by username');
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.username, username))
        .limit(1);

      if (!account) {
        logger.info({ username }, 'Account not found by username');
        return null;
      }

      logger.info(
        { username, uuid: account.uuid },
        'Account found by username'
      );
      return {
        id: account.id,
        uuid: account.uuid,
        username: account.username,
        password: account.password,
        createdAt: new Date(Number(account.createdAt) * 1000),
        updatedAt: new Date(Number(account.updatedAt) * 1000),
        lastLoginAt: new Date(Number(account.lastLoginAt) * 1000),
      };
    } catch (error) {
      logger.error({ username, error }, 'Failed to find account by username');
      throw new DatabaseError('Failed to find account by username', { error });
    }
  }

  async usernameExists(c: AppContext, username: string): Promise<boolean> {
    const logger = getLogger(c, 'auth-repository');
    const db = createDatabase(c);

    try {
      logger.info({ username }, 'Checking if username exists');
      const [exists] = await db
        .select({ count: accounts.id })
        .from(accounts)
        .where(eq(accounts.username, username))
        .limit(1);

      const usernameExists = !!exists;
      logger.info(
        { username, exists: usernameExists },
        'Username existence check completed'
      );
      return usernameExists;
    } catch (error) {
      logger.error({ username, error }, 'Failed to check if username exists');
      throw new DatabaseError('Failed to check if username exists', { error });
    }
  }

  async findAccountByUuid(
    c: AppContext,
    uuid: string
  ): Promise<AccountRecord | null> {
    const logger = getLogger(c, 'auth-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid }, 'Finding account by uuid');
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.uuid, uuid))
        .limit(1);

      if (!account) {
        logger.info({ uuid }, 'Account not found by uuid');
        return null;
      }

      logger.info(
        { uuid, username: account.username },
        'Account found by uuid'
      );
      return {
        id: account.id,
        uuid: account.uuid,
        username: account.username,
        password: account.password,
        createdAt: new Date(Number(account.createdAt) * 1000),
        updatedAt: new Date(Number(account.updatedAt) * 1000),
        lastLoginAt: new Date(Number(account.lastLoginAt) * 1000),
      };
    } catch (error) {
      logger.error({ uuid, error }, 'Failed to find account by uuid');
      throw new DatabaseError('Failed to find account by uuid', { error });
    }
  }

  async updateLastLogin(c: AppContext, uuid: string): Promise<void> {
    const logger = getLogger(c, 'auth-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid }, 'Updating last login');
      await db
        .update(accounts)
        .set({
          lastLoginAt: sql`(unixepoch())`,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(accounts.uuid, uuid));
      logger.info({ uuid }, 'Last login updated successfully');
    } catch (error) {
      logger.error({ uuid, error }, 'Failed to update last login');
      throw new DatabaseError('Failed to update last login', { error });
    }
  }

  async updatePassword(
    c: AppContext,
    uuid: string,
    hashedPassword: string
  ): Promise<void> {
    const logger = getLogger(c, 'auth-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid }, 'Updating account password');
      await db
        .update(accounts)
        .set({
          password: hashedPassword,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(accounts.uuid, uuid));
      logger.info({ uuid }, 'Account password updated successfully');
    } catch (error) {
      logger.error({ uuid, error }, 'Failed to update account password');
      throw new DatabaseError('Failed to update account password', { error });
    }
  }
}

container.registerSingleton(AuthRepository);
