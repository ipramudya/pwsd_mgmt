/** biome-ignore-all lint/style/noNonNullAssertion: this is not a problem */

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: 'src/lib/migrations',
  schema: './src/lib/schemas.ts',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DB_URL!,
    authToken: process.env.DB_TOKEN!,
  },
  migrations: {
    prefix: 'timestamp',
    table: 'drizzle_migrations',
  },
});
