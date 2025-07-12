# Password Management API

## Project Overview

A password management API built with Hono framework and Cloudflare Workers, using Turso database for storage. The API manages hierarchical data structures using a path-based system for organizing blocks and fields efficiently.

## Tech Stack

- **Framework**: Hono
- **Runtime**: Cloudflare Workers
- **Database**: Turso (libSQL)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Linting**: Biome + Ultracite
- **API Documentation**: Bruno

## Documentation and References

- Hono: <https://hono.dev/llms-full.txt>
- Turso: <https://docs.turso.tech/>
- Drizzle with Turso: <https://orm.drizzle.team/docs/tutorials/drizzle-with-turso>
- Cloudflare Workers: <https://developers.cloudflare.com/workers/>
- Zod: <https://v3.zod.dev/>
- Drizzle: <https://orm.drizzle.team/docs/overview>
- Bruno: <https://docs.usebruno.com/>

## Module Explanation

### Auth

Handles user authentication, authorization, and account verification including user registration, login, and JWT token rotation.

### Account

Stores user information and serves as the identity for block and field ownership.

**Database Schema:**

- id: number, primary key, autoincrement
- uuid: string, indexed, unique
- username: string, indexed, unique
- password: string, hashed
- createdAt: Unix timestamp
- updatedAt: Unix timestamp
- lastLoginAt: Unix timestamp

### Block

A hierarchical container that can store fields and other nested blocks. Uses a path-based system for efficient tree operations and navigation.

**Database Schema:**

- id: number, primary key, autoincrement
- uuid: string, indexed, unique
- name: string
- description: string, nullable
- path: string, indexed (e.g., "/123/456/789/")
- blockType: enum ('container', 'terminal')
- createdAt: Unix timestamp
- updatedAt: Unix timestamp
- createdById: string, references account.uuid
- parentId: number, nullable, references block.id

The path field enables efficient hierarchical queries and breadcrumb navigation without recursive operations. The blockType field distinguishes between container blocks (can have child blocks) and terminal blocks (can have fields but no children).

### Field

Data storage units within blocks. Each field has a specific type with corresponding data stored in separate tables.

**Database Schema:**

Field table:

- id: number, primary key, autoincrement
- uuid: string, indexed, unique
- name: string
- type: enum ('text', 'password', 'todo')
- createdAt: Unix timestamp
- updatedAt: Unix timestamp
- createdById: string, references account.uuid
- blockId: string, references block.uuid

Text field data:

- id: number, primary key, autoincrement
- text: string
- createdAt: Unix timestamp
- updatedAt: Unix timestamp
- fieldId: string, references field.uuid

Password field data:

- id: number, primary key, autoincrement
- password: string, encrypted
- createdAt: Unix timestamp
- updatedAt: Unix timestamp
- fieldId: string, references field.uuid

Todo field data:

- id: number, primary key, autoincrement
- isChecked: boolean, default false
- createdAt: Unix timestamp
- updatedAt: Unix timestamp
- fieldId: string, references field.uuid

## Security Features

- JWT-based authentication
- Token rotation
- Password validation with confirmation
- Input validation using Zod schemas
- Ownership verification - only creators can modify their data
- Password hashing for user accounts
- Password encryption for stored password fields
- Protected routes with authentication middleware

## Architecture

The project follows a layered architecture pattern:

- **Route**: Handles HTTP requests, validation, and responses
- **Service**: Contains business logic and orchestrates operations
- **Repository**: Manages database operations and queries
- **DTO**: Defines data transfer object types
- **Validation**: Zod schemas for input validation

## API Documentation

Complete API documentation is available using Bruno in the `/docs` directory, including:

- Request/response examples
- Automated test suites
- Environment configurations
- Authentication flows

## Endpoints

### Auth Endpoints (Prefix: `/api/v1/auth`)

- **POST /register**: Creates a new user account. Validates username and password, hashes the password, and returns user data (without password) along with JWT token pair.
- **POST /login**: Authenticates existing user. Validates credentials and returns user data with new JWT tokens. Updates lastLoginAt timestamp.
- **POST /refresh-token**: Refreshes expired access tokens. Validates refresh token and generates new token pair for continued authentication.

### System Endpoints (Prefix: `/api/v1/system`)

- **GET /health**: Basic health check that verifies database connectivity and returns simple status.
- **GET /health/detailed**: Comprehensive health check including database metrics (row counts for accounts, blocks, fields), response times, and detailed status information.

### Block Endpoints (Prefix: `/api/v1/blocks`)

- **POST /**: Creates a new block. Accepts name, description, blockType ('container' or 'terminal'), and optional parentId. Validates that parent blocks are container type before allowing children. Automatically generates path based on parent hierarchy. Records the creator ID from JWT token.

- **GET /**: Retrieves blocks with advanced filtering and pagination:
  - Supports cursor-based pagination (default limit: 10, max: 100)
  - Sortable by: name, createdAt, updatedAt
  - Sort order: asc or desc
  - Optional parentId filter to get children of specific block
  - Returns total count, pagination info, and next cursor

- **GET /:id**: Retrieves child blocks of specified parent block (by UUID). Uses same pagination and sorting as above but filtered to direct children only.

- **GET /:id/breadcrumbs**: Generates breadcrumb navigation for a specific block. Returns ordered array of parent blocks from root to current block, enabling navigation UI.

- **PUT /:id**: Updates block details (name and/or description) by UUID. Only the creator can update their blocks. Updates the updatedAt timestamp.

- **PUT /:id/move**: Moves a block to different parent or root level. Accepts targetParentId in request body (null for root). Automatically updates path for moved block and all descendants. Prevents circular references.

- **DELETE /:id**: Deletes a block and all its descendants. Requires confirmation by sending block name in request body to prevent accidental deletion. Uses path-based deletion for efficiency.

## Hierarchical Data Implementation

The system uses a path-based approach for managing hierarchical blocks:

- **Path Structure**: Each block has a path like "/123/456/789/" where numbers are block IDs
- **Benefits**:
  - Fast queries for all descendants using LIKE operations
  - Efficient breadcrumb generation by parsing path segments
  - Simple depth calculation from path length
  - Batch operations on subtrees

- **Operations**:
  - Finding children: WHERE path LIKE '/parent/path/%' AND depth = parent_depth + 1
  - Finding all descendants: WHERE path LIKE '/parent/path/%'
  - Moving subtrees: Batch update paths with string replacement
  - Breadcrumbs: Extract IDs from path and query for names

This approach eliminates the need for recursive queries while maintaining excellent performance for hierarchical operations.

## Bruno API Documentation

The `/docs` directory contains comprehensive Bruno collections:

- **Auth collection**: Registration, login, and token refresh examples
- **Blocks collection**: All CRUD operations with pagination examples
- **System collection**: Health check endpoints
- **Environment variables**: Base URLs and authentication tokens
- **Automated tests**: Validation of responses and data integrity

Each endpoint includes example requests, expected responses, and automated tests to ensure API reliability.
