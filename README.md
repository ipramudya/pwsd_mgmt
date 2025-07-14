# Password Management API

A modern, high-performance password management API built for the edge with hierarchical data organization, advanced search capabilities, and enterprise-grade security.

## What Makes This Special

This isn't just another password manager API. It's a **hierarchical data management system** that revolutionizes how you organize and access sensitive information:

- **Hierarchical Organization**: Organize your data in nested blocks like a sophisticated file system
- **Intelligent Search**: Find anything instantly with relevance-ranked, multi-field search
- **Edge Performance**: Built on Cloudflare Workers for global, lightning-fast responses
- **Military-Grade Security**: AES-256-GCM encryption with JWT authentication and token rotation
- **Modern Architecture**: TypeScript, Hono framework, and libSQL for type-safe, scalable development

## Key Features

### Hierarchical Data Management

- **Container Blocks**: Organize your data into logical groups and subgroups
- **Terminal Blocks**: Store actual password entries and sensitive data
- **Path-Based Navigation**: Efficient tree operations without recursive queries
- **Breadcrumb Support**: Easy navigation through complex hierarchies

### Advanced Security

- **AES-256-GCM Encryption**: Password fields encrypted with random IVs and auth tags
- **JWT Authentication**: Secure token-based auth with automatic rotation
- **Ownership Validation**: Users can only access their own data
- **Input Sanitization**: Comprehensive Zod schema validation

### Multiple Field Types

- **Password Fields**: Encrypted storage with automatic decryption
- **Text Fields**: Secure notes and metadata
- **Todo Fields**: Task management with completion tracking
- **Extensible Design**: Easy to add new field types

### Powerful Search Engine

- **Multi-Target Search**: Search across block names, descriptions, and field content
- **Relevance Ranking**: Smart scoring with exact matches prioritized
- **Real-Time Results**: Instant search with pagination and filtering
- **Navigation Integration**: Results include breadcrumbs and relative paths

### Recent Activity Tracking

- **Recent Blocks**: Quick access to newly created items
- **Recent Updates**: Track your latest modifications
- **Configurable Timeframes**: 1-30 day windows with sensible defaults

## Technology Stack

**Framework & Runtime:**

- [Hono](https://hono.dev/) - Ultra-fast web framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform

**Database & ORM:**

- [Turso](https://turso.tech/) - Distributed SQLite at the edge
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database toolkit

**Development:**

- **TypeScript** - Full type safety
- **Biome + Ultracite** - Advanced linting and formatting
- **Zod** - Runtime type validation

## API Overview

### Authentication Endpoints

```text
POST /api/v1/auth/register      # Create new account
POST /api/v1/auth/login         # Authenticate user
POST /api/v1/auth/refresh-token # Refresh access tokens
```

### Block Management

```text
POST   /api/v1/blocks           # Create new block
GET    /api/v1/blocks           # List root-level blocks
GET    /api/v1/blocks/:id       # Get block children
GET    /api/v1/blocks/recent    # Recently created blocks
GET    /api/v1/blocks/recent-updates # Recently updated blocks
PUT    /api/v1/blocks/:id       # Update block details
PUT    /api/v1/blocks/:id/move  # Move block to new parent
DELETE /api/v1/blocks/:id       # Delete block and descendants
```

### Field Operations

```text
POST   /api/v1/fields           # Create fields (batch)
PUT    /api/v1/fields           # Update fields (batch)
DELETE /api/v1/fields           # Delete fields (batch)
```

### Search & Discovery

```text
GET    /api/v1/search           # Comprehensive search
```

### System Health

```text
GET    /api/v1/system/health          # Basic health check
GET    /api/v1/system/health/detailed # Detailed system metrics
```

## Architecture Highlights

### Path-Based Hierarchies

Instead of complex recursive queries, we use an elegant path-based system:

```text
Root Block: /123/
  ├── Child: /123/456/
  └── Grandchild: /123/456/789/
```

**Benefits:**

- Lightning-fast descendant queries
- Instant breadcrumb generation  
- Simple depth calculations
- Efficient batch operations

### Layered Architecture

```text
┌─────────────────┐
│     Routes      │  HTTP handling & validation
├─────────────────┤
│    Services     │  Business logic & orchestration
├─────────────────┤
│  Repositories   │  Database operations
├─────────────────┤
│    Database     │  Turso libSQL
└─────────────────┘
```

### Security Model

- **Encryption at Rest**: Password fields use AES-256-GCM
- **JWT Tokens**: Secure authentication with refresh rotation
- **User Isolation**: Strict ownership validation
- **Input Validation**: Comprehensive Zod schemas

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd pass-management-api

# Install dependencies
npm install

# Set up environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual credentials

# Start development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Environment Configuration

#### Local Development

1. **Copy the environment template:**

   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Update `.dev.vars` with your actual credentials:**

   ```bash
   JWT_SECRET_ACCESS=your-jwt-access-secret-here
   JWT_SECRET_REFRESH=your-jwt-refresh-secret-here
   DB_URL=libsql://your-database-url-here
   DB_TOKEN=your-database-token-here
   ENCRYPTION_MASTER_KEY=your-encryption-master-key-here
   ```

3. **Never commit `.dev.vars` to version control** - it contains sensitive credentials.

#### Production Deployment

For production, use Cloudflare secrets instead of environment variables for better security:

```bash
# Set production secrets (more secure than environment variables)
wrangler secret put JWT_SECRET_ACCESS
wrangler secret put JWT_SECRET_REFRESH
wrangler secret put DB_TOKEN
wrangler secret put ENCRYPTION_MASTER_KEY

# Set non-sensitive environment variables
wrangler env add DB_URL
```

## Documentation

### API Documentation

Complete API documentation is available via **Bruno** collections in the `/docs` directory:

- **Authentication flows** with examples
- **Block operations** with pagination
- **Field management** for all types  
- **Search capabilities** with filtering
- **Health monitoring** endpoints

### Testing

Each endpoint includes:

- **Request/response examples**
- **Automated test suites**
- **Environment configurations**
- **Validation scenarios**

## Security Features

- **AES-256-GCM Encryption**: Password fields encrypted before storage
- **JWT Authentication**: Secure token-based auth with rotation
- **Ownership Validation**: Users can only access their own data
- **Input Sanitization**: Comprehensive validation with Zod
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **Rate Limiting**: Built into Cloudflare Workers platform

## Why Choose This API?

**For Developers:**

- **Type-Safe**: Full TypeScript coverage from database to API
- **High Performance**: Edge computing with global distribution
- **Modern Stack**: Latest tools and best practices
- **Well Documented**: Comprehensive guides and examples

**For Applications:**

- **Advanced Search**: Find anything instantly
- **Flexible Organization**: Hierarchical data that makes sense
- **Enterprise Security**: Military-grade encryption and validation
- **API-First**: Built for modern web and mobile apps

**For Operations:**

- **Global Performance**: Cloudflare's edge network
- **Observable**: Built-in health checks and monitoring
- **Maintainable**: Clean architecture and comprehensive tests
- **Scalable**: Serverless architecture that grows with you

## Contributing

We welcome contributions! Please see our contribution guidelines for details on how to submit pull requests, report issues, and suggest improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

[Documentation](./docs) • [API Reference](./docs) • [Contributing](./CONTRIBUTING.md)
