import { drizzle } from 'drizzle-orm/libsql';
import type { AppContext } from '../types';

export function createDatabase(c: AppContext) {
  return drizzle({
    connection: {
      url: c.env.DB_URL,
      authToken: c.env.DB_TOKEN,
    },
  });
}

export type Database = ReturnType<typeof createDatabase>;
