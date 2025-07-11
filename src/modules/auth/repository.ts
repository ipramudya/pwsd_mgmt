import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { accounts } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { AccountRecord, CreateAccountInput } from './dto';

export class AuthRepository {
  private db: ReturnType<typeof drizzle>;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.db = drizzle(c.env.DB);
    this.logger = getLogger(c, 'auth-repository');
  }

  async createAccount(input: CreateAccountInput): Promise<void> {
    try {
      this.logger.info(
        { uuid: input.uuid, username: input.username },
        'Creating account'
      );
      await this.db.insert(accounts).values({
        uuid: input.uuid,
        username: input.username,
        password: input.password,
      });
      this.logger.info(
        { uuid: input.uuid, username: input.username },
        'Account created successfully'
      );
    } catch (error) {
      this.logger.error(
        { uuid: input.uuid, username: input.username, error },
        'Failed to create account'
      );
      throw new DatabaseError('Failed to create account', { error });
    }
  }

  async findAccountByUsername(username: string): Promise<AccountRecord | null> {
    try {
      this.logger.info({ username }, 'Finding account by username');
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.username, username))
        .limit(1);

      if (!account) {
        this.logger.info({ username }, 'Account not found by username');
        return null;
      }

      this.logger.info(
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
      this.logger.error(
        { username, error },
        'Failed to find account by username'
      );
      throw new DatabaseError('Failed to find account by username', { error });
    }
  }

  async findAccountByUuid(uuid: string): Promise<AccountRecord | null> {
    try {
      this.logger.info({ uuid }, 'Finding account by uuid');
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.uuid, uuid))
        .limit(1);

      if (!account) {
        this.logger.info({ uuid }, 'Account not found by uuid');
        return null;
      }

      this.logger.info(
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
      this.logger.error({ uuid, error }, 'Failed to find account by uuid');
      throw new DatabaseError('Failed to find account by uuid', { error });
    }
  }

  async updateLastLogin(uuid: string): Promise<void> {
    try {
      this.logger.info({ uuid }, 'Updating last login');
      await this.db
        .update(accounts)
        .set({
          lastLoginAt: sql`(unixepoch())`,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(accounts.uuid, uuid));
      this.logger.info({ uuid }, 'Last login updated successfully');
    } catch (error) {
      this.logger.error({ uuid, error }, 'Failed to update last login');
      throw new DatabaseError('Failed to update last login', { error });
    }
  }

  async usernameExists(username: string): Promise<boolean> {
    try {
      this.logger.info({ username }, 'Checking if username exists');
      const [exists] = await this.db
        .select({ count: accounts.id })
        .from(accounts)
        .where(eq(accounts.username, username))
        .limit(1);

      const usernameExists = !!exists;
      this.logger.info(
        { username, exists: usernameExists },
        'Username existence check completed'
      );
      return usernameExists;
    } catch (error) {
      this.logger.error(
        { username, error },
        'Failed to check if username exists'
      );
      throw new DatabaseError('Failed to check if username exists', { error });
    }
  }
}
