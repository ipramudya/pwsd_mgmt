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
- Bruno: <https://docs.usebruno.com/>

## Module Explanation

### Auth

Everything related to user authentication, authorization, and account verification. This definitely includes functionalities like register, login, reset access token, and token rotation logic.

### Account

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

### Block

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

### Field

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

## Folder structure

For each module should have at least a route-controller, service, and repository. Here's the explanation:

- **route-controller**: this file can be split into separate route and controller files if it gets too complex. But if it's not, just place it under route. The main role of the route-controller is to handle I/O processes — reading input from requests and returning responses. Reading from query params, request body, form data, and so on. Those things happen in this layer. Middleware is also added in this layer.
- **service**: core business logic goes here, such as hashing passwords, shaping data structures, omitting data before sending it back to the route-controller layer, and handling processes before or after database reads or writes. A service can call other services.
- **repository**: this layer handles database interaction. It contains query instructions and raw SQL (if needed). Each function in this layer should receive a ready-to-use entity as a parameter (for storing or using as a reference). Business logic should not be written in this layer.
- **dto**: Consists of types/interfaces (and constants if any) representing the data structure of I/O
- **validation**: Zod schema for validating input from the request body, request query, or form data. Mostly used on routes that perform data mutation (POST, PUT requests). The resulting schema will be used in the zValidator wrapper middleware.
- **(dynamic-utility)**: If you want to separate business logic as a utility entity into a dedicated file within the same module, you can create a file named after the utility itself. For example, the `password.ts` file is a utility of the auth module for hashing passwords.

## Endpoints

### Auth Endpoints

- **POST /auth/register**: During account creation, the password must be hashed before saving. After saving the data, return the account information without the password, along with a token pair to be stored in the browser.
- **POST /auth/login**: User authentication process. After success, return the token pair and user data.
- **POST /auth/refresh-token**: Token rotation process when the access token is no longer valid. The refresh token sent in the body will be verified to generate a new token pair, which will then be stored in the browser.

### System Endpoints

- **GET /system/health**: General healthcheck to check database connectivity.
- **GET /system/health/detailed**: Detailed healthcheck consisting row counting and other detailed.

### Block Endpoints

- **POST /blocks**: Block creation, input can be adjusted according to the block schema. After the block is created, it will return the block data itself. Block creation must store the ID of the user who created the block, which can be obtained from the JWT payload.
- **GET /blocks**: The block retrieval process will, by default, filter for blocks with a depth level of 0. This endpoint must support pagination with a default of 10 rows (10/15/20 rows selectable). Pagination handling should prioritize performance—cursor-based pagination is recommended. The system only supports back-next pagination and does not require jumping to a specific page. Sorting should also be handled in ascending or descending order, based on column names such as `createdAt` or `updatedAt`.
- **GET /blocks/:id**: The process of retrieving blocks uses UUIDs. A block will display a list of inner blocks one level below the referenced parent block. Pagination and sorting still apply to this endpoint.
- **PUT /blocks/:id**: The block update process is based on the provided UUID. The `updatedAt` field is also set during this process.
- **PUT /blocks/:id/move**: Block moving process. Send the UUID of the block to be moved in the endpoint, and the target block ID in the request body. The target block ID can be empty, indicating the block will be moved to the root level. If a target block ID is provided, the block will become a child of the target block, and its depth level must be adjusted accordingly. The `updatedAt` field is also set during this process.
- **DELETE /blocks/:id**: Block deletion process is based on the provided UUID. When a block is deleted, all its child blocks will also be deleted. I want a confirmation step before deletion, where the frontend must send the block’s name to make the deletion process explicit (what do you think?).

## Revision: Enumerate List

I want to make a revision, but before that I’d like to ask about the deep level property in the block table. Please think harder - is this important and necessary? I want to make the block to be hierarchical tree data  with better performance. On the app, i want to list as breadcrumb as well for better navigation between blocks. In this current setup and endpoints definition, i want to implement a `path enumerate list` so the system can support breadcrumbs properly and perform better. But I’d like to ask—does the path enumerate list use IDs (numbers) as references, or something else? Please think harder about this. However, note that for retrieving a block and its children, I still want to use the UUID of the referenced block.
