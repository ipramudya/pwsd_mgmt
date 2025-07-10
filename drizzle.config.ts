/** biome-ignore-all lint/style/noNonNullAssertion: this is not a problem */

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: 'src/lib/migrations',
  schema: './src/lib/schemas.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DB_ID!,
    token: process.env.CLOUDFLARE_TOKEN!,
  },
  migrations: {
    prefix: 'timestamp',
    table: 'orm-migrations',
  },
});
