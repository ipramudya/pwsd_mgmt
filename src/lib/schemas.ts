import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: int().primaryKey({ autoIncrement: true }),
  username: text().notNull().unique(),
  password: text().notNull(),
  createdAt: text().notNull().default(new Date().toISOString()),
  updatedAt: text().notNull().default(new Date().toISOString()),
  lastLoginAt: text().notNull().default(new Date().toISOString()),
});
