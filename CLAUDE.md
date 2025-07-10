# Password Management API

## Project Overview

A password management API built with Hono framework and Cloudflare Workers, using D1 database for storage.

## Tech Stack

- **Framework**: Hono
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Linting**: Biome + Ultracite

## Documentation and References

- Hono: <https://hono.dev/llms-full.txt>
- Cloudflare D1: <https://developers.cloudflare.com/d1/>
- Cloudflare Workers: <https://developers.cloudflare.com/workers/>
- Zod: <https://v3.zod.dev/>
- Drizzle: <https://orm.drizzle.team/docs/overview>

## Module Explanation

### Auth

Everything related to user authentication, authorization, and account verification. This definitely includes functionalities like register, login, reset access token, and token rotation logic.

### Accounts

The user's account stores their information and is used as the identity of the block or field owner.

This is the technical database table schema

- id: number, primary key, autoincrement
- uuid: uuid string, indexed
- username: string, indexed, unique
- password: string, hashed
- createdAt: date
- updatedAt: date
- lastLoginAt: string

All of those is not null.

### Blocks

A parent entity is used to store one or more fields. A block can also have a parent or be nested. A block can be seen as a folder that can be stored inside another folder. Files inside a block are fields.

This is the technical database table schema

- id: number, primary key, autoincrement
- uuid: uuid string, indexed
- name: string
- description: string, nullable
- deepLevel: number
- isFinal: boolean
- createdAt: date
- updatedAt: date
- createdById: reference to account's uuid
- parentId: reference to self's uuid

The column structure in this table can be improved. If there is any missing or additional data needed, feel free to add it. I'm not yet sure about the current column structure.

### Fields

Data representation to be stored in a block. The data is stored as key-value pairs. Each field has its own type. Currently, a field can be of type `text`, `password`, or `todo`. Each type has its own data representation. The data will be stored in the corresponding table. For example, data from a `text` type field will be stored in the `text_field` table, and so on. The data schema will be explained later.

These are technical database table schemas

For field itself

- id: number, primary key, autoincrement
- uuid: uuid string, indexed
- name: string
- type: enum of `text`, `password`, `todo`
- createdAt: date
- updatedAt: date
- createdById: reference to account's uuid
- blockId: reference to block's uuid

For text_field

- id: number, primary key, autoincrement
- text: string
- createdAt: date
- updatedAt: date
- fieldId: reference to field's uuid

For password_field

- id: number, primary key, autoincrement
- password: string, hashed
- createdAt: date
- updatedAt: date
- fieldId: reference to field's uuid

For password_field

- id: number, primary key, autoincrement
- isChecked: boolean
- createdAt: date
- updatedAt: date
- fieldId: reference to field's uuid

The column structure in these tables can be improved. If there is any missing or additional data needed, feel free to add it. I'm not yet sure about the current column design. If there's a better approach due to reasons like inefficiency, verbosity, increased complexity, or similar concerns, improvements are welcome.

## Security Features

- JWT-based authentication
- Token rotation
- Password validation with confirmation
- Input validation using Zod schemas
- The creation of blocks and fields will record the creator, so any updates must be made by the same owner who created the data.
- Stored password data will not be saved in plain text. Passwords in the account table will be hashed. Passwords in the field table will be encoded and decoded using a secure algorithm (encryption or something similar, I'm not sure).
