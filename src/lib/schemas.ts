import { relations, sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    uuid: text().notNull().unique(),
    username: text().notNull().unique(),
    password: text().notNull(),
    createdAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    lastLoginAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("accounts_uuid_idx").on(t.uuid),
    index("accounts_username_idx").on(t.username),
  ],
);

export const blocks = sqliteTable(
  "blocks",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    uuid: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    path: text().notNull(),
    blockType: text({ enum: ["container", "terminal"] }).notNull(),
    createdAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdById: text().notNull(),
    parentId: integer({ mode: "number" }),
  },
  (t) => [
    index("blocks_uuid_idx").on(t.uuid),
    index("blocks_created_by_idx").on(t.createdById),
    index("blocks_parent_idx").on(t.parentId),
    index("blocks_path_idx").on(t.path),
    index("blocks_block_type_idx").on(t.blockType),
    index("blocks_container_parent_idx").on(t.parentId, t.blockType),
    // Foreign key constraints
    foreignKey({
      columns: [t.createdById],
      foreignColumns: [accounts.uuid],
      name: "blocks_created_by_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: "blocks_parent_fk",
    }).onDelete("cascade"),
  ],
);

export const fields = sqliteTable(
  "fields",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    uuid: text().notNull().unique(),
    name: text().notNull(),
    type: text({ enum: ["text", "password", "todo"] }).notNull(),
    createdAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdById: text().notNull(),
    blockId: text().notNull(),
  },
  (t) => [
    index("fields_uuid_idx").on(t.uuid),
    index("fields_created_by_idx").on(t.createdById),
    index("fields_block_idx").on(t.blockId),
    index("fields_type_idx").on(t.type),
    // Foreign key constraints
    foreignKey({
      columns: [t.createdById],
      foreignColumns: [accounts.uuid],
      name: "fields_created_by_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.blockId],
      foreignColumns: [blocks.uuid],
      name: "fields_block_fk",
    }).onDelete("cascade"),
  ],
);

export const textFields = sqliteTable(
  "text_fields",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    text: text().notNull(),
    createdAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    fieldId: text().notNull(),
  },
  (t) => [
    index("text_fields_field_idx").on(t.fieldId),
    foreignKey({
      columns: [t.fieldId],
      foreignColumns: [fields.uuid],
      name: "text_fields_field_fk",
    }).onDelete("cascade"),
  ],
);

export const passwordFields = sqliteTable(
  "password_fields",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    password: text().notNull(),
    createdAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    fieldId: text().notNull(),
  },
  (t) => [
    index("password_fields_field_idx").on(t.fieldId),
    foreignKey({
      columns: [t.fieldId],
      foreignColumns: [fields.uuid],
      name: "password_fields_field_fk",
    }).onDelete("cascade"),
  ],
);

export const todoFields = sqliteTable(
  "todo_fields",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    isChecked: integer({ mode: "boolean" }).notNull().default(false),
    createdAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    fieldId: text().notNull(),
  },
  (t) => [
    index("todo_fields_field_idx").on(t.fieldId),
    foreignKey({
      columns: [t.fieldId],
      foreignColumns: [fields.uuid],
      name: "todo_fields_field_fk",
    }).onDelete("cascade"),
  ],
);

export const accountsRelations = relations(accounts, ({ many }) => ({
  blocks: many(blocks),
  fields: many(fields),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  creator: one(accounts, {
    fields: [blocks.createdById],
    references: [accounts.uuid],
  }),
  parent: one(blocks, {
    fields: [blocks.parentId],
    references: [blocks.id],
    relationName: "parentChild",
  }),
  children: many(blocks, {
    relationName: "parentChild",
  }),
  fields: many(fields),
}));

export const fieldsRelations = relations(fields, ({ one }) => ({
  creator: one(accounts, {
    fields: [fields.createdById],
    references: [accounts.uuid],
  }),
  block: one(blocks, {
    fields: [fields.blockId],
    references: [blocks.uuid],
  }),
  textField: one(textFields, {
    fields: [fields.uuid],
    references: [textFields.fieldId],
  }),
  passwordField: one(passwordFields, {
    fields: [fields.uuid],
    references: [passwordFields.fieldId],
  }),
  todoField: one(todoFields, {
    fields: [fields.uuid],
    references: [todoFields.fieldId],
  }),
}));

export const textFieldsRelations = relations(textFields, ({ one }) => ({
  field: one(fields, {
    fields: [textFields.fieldId],
    references: [fields.uuid],
  }),
}));

export const passwordFieldsRelations = relations(passwordFields, ({ one }) => ({
  field: one(fields, {
    fields: [passwordFields.fieldId],
    references: [fields.uuid],
  }),
}));

export const todoFieldsRelations = relations(todoFields, ({ one }) => ({
  field: one(fields, {
    fields: [todoFields.fieldId],
    references: [fields.uuid],
  }),
}));
