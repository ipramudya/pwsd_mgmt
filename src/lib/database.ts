import { drizzle } from 'drizzle-orm/libsql';
import type { AppContext } from '../types';
import {
  accounts,
  accountsRelations,
  blocks,
  blocksRelations,
  fields,
  fieldsRelations,
  passwordFields,
  passwordFieldsRelations,
  textFields,
  textFieldsRelations,
  todoFields,
  todoFieldsRelations,
} from './schemas';

const schema = {
  accounts,
  accountsRelations,
  blocks,
  blocksRelations,
  fields,
  fieldsRelations,
  passwordFields,
  passwordFieldsRelations,
  textFields,
  textFieldsRelations,
  todoFields,
  todoFieldsRelations,
};

export function createDatabase(c: AppContext) {
  return drizzle({
    connection: {
      url: c.env.DB_URL,
      authToken: c.env.DB_TOKEN,
    },
    schema,
  });
}

export type Database = ReturnType<typeof createDatabase>;
