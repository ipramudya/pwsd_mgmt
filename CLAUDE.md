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

### Search

Provides comprehensive search functionality across user's blocks and fields with advanced filtering, pagination, and navigation support. Implements dual search capability (blocks and fields) with relevance ranking and result deduplication.

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
- **AES-256-GCM Password Field Encryption**: Password fields are encrypted before storage using AES-256-GCM encryption with random initialization vectors and authentication tags. Passwords are automatically decrypted when retrieved, allowing secure storage while maintaining usability in other applications.
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

### Field Endpoints (Prefix: `/api/v1/fields`)

- **POST /**: Creates fields in batch. Accepts an array of fields with different types (text, password, todo) and either attaches them to an existing terminal block (via blockId) or creates a new terminal block (via blockName). Each field has a name, type, and type-specific data. When creating a new block, supports optional parentId for hierarchical placement and description. Validates that target blocks are terminal type and verifies ownership. Returns created fields with their data and optionally the created block. Password fields are automatically encrypted using AES-256-GCM before storage.
- **PUT /**: Updates multiple fields in batch. Accepts an array of field updates with id, name, and type-specific data changes. Validates ownership and field existence. Only allows updating fields within terminal blocks owned by the authenticated user.
- **DELETE /**: Deletes multiple fields in batch. Accepts blockId and array of field IDs to delete. Validates ownership of both the block and fields before deletion. Ensures only fields within terminal blocks can be deleted.

### Block Endpoints (Prefix: `/api/v1/blocks`)

- **POST /**: Creates a new block. Accepts name, description, blockType ('container' or 'terminal'), and optional parentId. Validates that parent blocks are container type before allowing children. Automatically generates path based on parent hierarchy. Records the creator ID from JWT token.

- **GET /**: Retrieves blocks at root level with advanced filtering and pagination:
  - Supports cursor-based pagination (default limit: 10, max: 100)
  - Sortable by: name, createdAt, updatedAt
  - Sort order: asc or desc
  - Returns both container and terminal type blocks
  - Terminal blocks include all their fields with decrypted password data
  - Container blocks show structure only
  - Returns total count, pagination info, and next cursor

- **GET /:id**: Retrieves child blocks of specified parent block (by UUID). Uses same pagination and sorting as root level but filtered to direct children only. Returns both container and terminal blocks, with terminal blocks including all their fields with decrypted password data.

- **GET /:id/breadcrumbs**: Generates breadcrumb navigation for a specific block. Returns ordered array of parent blocks from root to current block, enabling navigation UI.

- **PUT /:id**: Updates block details (name and/or description) by UUID. Only the creator can update their blocks. Updates the updatedAt timestamp.

- **PUT /:id/move**: Moves a block to different parent or root level. Accepts targetParentId in request body (null for root). Automatically updates path for moved block and all descendants. Prevents circular references.

- **DELETE /:id**: Deletes a block and all its descendants. Requires confirmation by sending block name in request body to prevent accidental deletion. Uses path-based deletion for efficiency.

- **GET /recent**: Retrieves recently created blocks (last 7 days by default). Returns maximum 10 blocks ordered by creation date descending:
  - Optional days parameter: 1-30 days timeframe (default: 7)
  - Terminal blocks include all their fields with decrypted password data
  - Returns count, timeframe, and blocks array
  - Only shows blocks owned by authenticated user

- **GET /recent-updates**: Retrieves recently updated blocks (last 7 days by default). Returns maximum 10 blocks ordered by update date descending:
  - Optional days parameter: 1-30 days timeframe (default: 7)
  - Terminal blocks include all their fields with decrypted password data
  - Returns count, timeframe, and blocks array
  - Only shows blocks owned by authenticated user

### Search Endpoints (Prefix: `/api/v1/search`)

- **GET /**: Comprehensive search functionality for blocks and fields. Searches through user's blocks by name and description, and fields by name. Returns unified results with navigation support:
  - Query parameter: search term (required, 1-500 characters)
  - Block type filter: 'container', 'terminal', or 'all' (default: 'all')
  - Pagination: cursor-based with configurable limit (default: 20, max: 100)
  - Sorting: by relevance (default), name, createdAt, or updatedAt
  - Sort order: asc or desc (default: desc)
  - Returns blocks with breadcrumb navigation and relative paths
  - Terminal blocks include all their fields with decrypted password data
  - Field matches include parent block information and match context
  - Implements relevance ranking with exact matches prioritized
  - Supports deduplication when blocks match both name/description and contain matching fields

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
- **Fields collection**: Batch field operations with different field types
- **Search collection**: Search functionality with filtering and navigation
- **System collection**: Health check endpoints
- **Environment variables**: Base URLs and authentication tokens
- **Automated tests**: Validation of responses and data integrity

Each endpoint includes example requests, expected responses, and automated tests to ensure API reliability.

## Development Commands

- **Linting**: `npm run lint` - Runs Biome linter for code quality
- **Type checking**: `npm run typecheck` - Validates TypeScript types
- **Development**: `npm run dev` - Starts local development server with Wrangler
- **Deployment**: `npm run deploy` - Deploys to Cloudflare Workers

## Recent Changes

### Database Migration (Latest)

- Migrated from Cloudflare D1 SQLite to Turso libSQL for enhanced performance and features
- Updated database connection configuration in `wrangler.jsonc`
- Modified database client imports and initialization across all modules
- Implemented Field module with complete CRUD operations for text, password, and todo field types
- Added AES-256-GCM encryption for password fields with automatic encryption/decryption

### Field Module Implementation

- **Complete field management system** with support for multiple field types
- **Batch field creation** with automatic block creation when needed
- **Type-specific data storage** in separate tables for text, password, and todo fields
- **Ownership validation** ensuring users can only access their own fields
- **Password field encryption** using AES-256-GCM with random IVs and auth tags
- **Field retrieval APIs** with automatic password decryption for usability

### Enhanced Block Module

- **Architecture Restructuring**: Moved field retrieval from individual field endpoints to block-centric approach for better performance and API design
- **Unified Block Response**: GET block endpoints now return both container and terminal blocks, with terminal blocks automatically including all their fields
- **Performance Optimization**: Implemented Drizzle ORM relational queries to eliminate N+1 query problems when fetching blocks with fields
- **Batch Field Operations**: Added comprehensive batch update and delete operations for fields with proper validation and ownership checks
- Updated block routes to work with new libSQL database connection
- Maintained all existing hierarchical operations and path-based queries
- Preserved pagination, filtering, and sorting capabilities

### Search Module Implementation

- **Comprehensive Search System**: New dedicated search module with separate repository, service, and route layers
- **Dual Search Capability**: Searches both blocks (by name/description) and fields (by name) with unified result presentation
- **Navigation Support**: Each search result includes breadcrumb navigation and relative paths for frontend integration
- **Performance Optimized**: Uses efficient database queries with proper indexing and batch operations via Promise.all
- **Advanced Filtering**: Supports block type filtering (container/terminal/all), pagination, and multiple sorting options
- **Relevance Ranking**: Implements intelligent relevance scoring with exact matches prioritized over partial matches
- **Result Deduplication**: Prevents duplicate results when blocks match both name/description and contain matching fields
- **Type Safety**: Full TypeScript implementation with proper Drizzle ORM typing and comprehensive error handling
- **Authentication Required**: Private endpoint requiring JWT authentication with user ownership validation
- **Bruno Documentation**: Complete API documentation with automated test suites for search functionality

### Recent Data Access Implementation

- **Recent Blocks Endpoints**: Two new endpoints for accessing recently created and recently updated blocks
- **Fixed Result Limit**: Both endpoints return exactly 10 items maximum for consistent UI experience
- **Configurable Timeframe**: Support for 1-30 days parameter with sensible 7-day default
- **Optimized Queries**: SQL date filtering with proper indexing on createdAt and updatedAt columns
- **Field Integration**: Automatic inclusion of decrypted password fields for terminal-type blocks
- **Proper Ordering**: Recent blocks by creation date DESC, recent updates by update date DESC
- **Validation & Security**: Comprehensive input validation and user ownership enforcement
- **Error Handling**: Graceful degradation when field loading fails for individual blocks
- **Type Safety**: Full TypeScript implementation with proper repository, service, and route patterns
- **Documentation**: Complete Bruno API test suites with comprehensive validation scenarios
