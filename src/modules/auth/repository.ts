import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { accounts } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { AccountRecord, CreateAccountInput } from './dto';

export class AuthRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(c: AppContext) {
    this.db = drizzle(c.env.DB);
  }

  async createAccount(input: CreateAccountInput): Promise<void> {
    await this.db.insert(accounts).values({
      uuid: input.uuid,
      username: input.username,
      password: input.password,
    });
  }

  async findAccountByUsername(username: string): Promise<AccountRecord | null> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.username, username))
      .limit(1);

    if (!account) {
      return null;
    }

    return {
      id: account.id,
      uuid: account.uuid,
      username: account.username,
      password: account.password,
      createdAt: new Date(Number(account.createdAt) * 1000),
      updatedAt: new Date(Number(account.updatedAt) * 1000),
      lastLoginAt: new Date(Number(account.lastLoginAt) * 1000),
    };
  }

  async findAccountByUuid(uuid: string): Promise<AccountRecord | null> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.uuid, uuid))
      .limit(1);

    if (!account) {
      return null;
    }

    return {
      id: account.id,
      uuid: account.uuid,
      username: account.username,
      password: account.password,
      createdAt: new Date(Number(account.createdAt) * 1000),
      updatedAt: new Date(Number(account.updatedAt) * 1000),
      lastLoginAt: new Date(Number(account.lastLoginAt) * 1000),
    };
  }

  async updateLastLogin(uuid: string): Promise<void> {
    await this.db
      .update(accounts)
      .set({
        lastLoginAt: sql`(unixepoch())`,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(accounts.uuid, uuid));
  }

  async usernameExists(username: string): Promise<boolean> {
    const [exists] = await this.db
      .select({ count: accounts.id })
      .from(accounts)
      .where(eq(accounts.username, username))
      .limit(1);

    return !!exists;
  }
}