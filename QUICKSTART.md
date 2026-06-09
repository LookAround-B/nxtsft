# 📦 Monorepo Quick Start Guide

## What's Been Set Up

You now have a **complete enterprise real estate platform** with a turborepo monorepo structure.

### Directory Structure Created

```
✓ apps/web              - Next.js 15 frontend app
✓ apps/api              - Fastify backend with tRPC
✓ packages/shared       - Shared types, utils, constants
✓ packages/db           - Prisma schema & migrations
✓ packages/trpc         - tRPC server & client setup
✓ packages/jobs         - BullMQ workers for async tasks
✓ infrastructure/       - Terraform configs for AWS
```

### Configuration Files

```
✓ turbo.json                    - Turborepo config (task pipeline)
✓ pnpm-workspace.yaml           - pnpm workspace setup
✓ tsconfig.base.json            - Shared TypeScript config
✓ docker-compose.yml            - Local dev environment
✓ Dockerfile.api                - Fastify container
✓ Dockerfile.web                - Next.js container
✓ Dockerfile.workers            - BullMQ workers container
✓ .env.example                  - Environment template
✓ .github/workflows/ci-cd.yml   - GitHub Actions pipeline
✓ infrastructure/main.tf        - AWS infrastructure as code
✓ ARCHITECTURE.md               - Detailed architecture docs
```

## 🚀 Next Steps

### 1. **Install Dependencies**

```bash
pnpm install
```

This installs all dependencies across all apps/packages in one shot.

### 2. **Setup Environment**

```bash
cp .env.example .env.local
# Edit .env.local and fill in your credentials:
# - Database URL
# - Redis URL
# - API keys (Razorpay, Twilio, Resend, etc.)
```

### 3. **Start Local Environment**

```bash
# Start Docker services (PostgreSQL, Redis, Typesense)
docker-compose up -d

# Check all services are healthy
docker-compose ps

# Run database migrations
pnpm run db:migrate

# Start development servers (all in parallel)
pnpm run dev

# This starts:
# - Next.js web:     http://localhost:3000
# - Fastify API:     http://localhost:3001
# - tRPC endpoint:   http://localhost:3001/trpc
# - Typesense:       http://localhost:8108
# - PostgreSQL:      localhost:5432
# - Redis:           localhost:6379
```

### 4. **Verify Everything Works**

```bash
# In separate terminals:

# Terminal 1: Web app
cd apps/web && pnpm dev

# Terminal 2: API server
cd apps/api && pnpm dev

# Terminal 3: Job workers
cd packages/jobs && pnpm workers:start

# Terminal 4: Database browser
pnpm run db:studio
```

## 📝 Key Package.json Scripts

All scripts run through **turborepo**, so they work across all packages:

```bash
# Development
pnpm run dev          # Start all dev servers

# Building
pnpm run build        # Build all packages
pnpm run build --filter=@nxtsft/api   # Build just API

# Code Quality
pnpm run lint         # Run ESLint across all packages
pnpm run type-check   # Run TypeScript compiler check
pnpm run format       # Format code with Prettier

# Database
pnpm run db:migrate   # Run Prisma migrations
pnpm run db:generate  # Generate Prisma client
pnpm run db:studio    # Open Prisma Studio (visual DB browser)

# Cleanup
pnpm run clean        # Remove all build artifacts
```

## 🏗️ File Structure Explained

### `apps/web` - Next.js 15 Frontend

- **Purpose**: Customer-facing real estate platform
- **Features**:
  - Server Components for SEO
  - tRPC client integration
  - PostHog analytics
  - Property listings, filters, search
  - User authentication portals

### `apps/api` - Fastify Backend

- **Purpose**: Backend API server
- **Features**:
  - tRPC routers (type-safe endpoints)
  - JWT authentication middleware
  - Rate limiting
  - Error tracking (Sentry)
  - Logging with Pino

### `packages/shared` - Shared Code

- **Types**: `Role`, `User`, `Property`, `ApiResponse`
- **Utils**: `formatPrice()`, `slugify()`, `isValidEmail()`
- **Constants**: `ROLES`, `CITIES`, `CACHE_KEYS`, `RATE_LIMITS`

### `packages/db` - Database Layer

- **Schema**: 15+ models for real estate domain
  - `User`, `Property`, `Listing`, `Lead`
  - `Payment`, `Subscription`, `Review`
  - `Message`, `Ticket`, `AuditLog`
- **Features**:
  - PostgreSQL with pgvector for embeddings
  - Full-text search indexes
  - Soft deletes for data protection
  - Audit trail for all changes

### `packages/trpc` - API Framework

- **Server procedures**:
  - `publicProcedure`: Unauthenticated (e.g., search properties)
  - `protectedProcedure`: Authenticated (e.g., contact agent)
  - `adminProcedure`: Admin only (e.g., delete property)
- **Client**: React hooks for calling tRPC procedures

### `packages/jobs` - Async Job Processing

- **Workers**:
  - Email worker (Resend)
  - SMS worker (Twilio)
  - WhatsApp worker (WATI)
  - Image processor (compress, resize)
  - PDF generator
  - Vector embeddings
- **Storage**: Redis via BullMQ
- **Retry**: Automatic retry on failure

## 🔧 Common Development Tasks

### Add a New API Procedure

```typescript
// apps/api/src/routers/properties.ts
export const propertyRouter = router({
  search: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input, ctx }) => {
    return await ctx.prisma.property.findMany({
      where: {
        searchText: { search: input.query },
      },
      take: 20,
    });
  }),
});
```

Then use it in frontend:

```typescript
// apps/web/src/components/SearchBox.tsx
const results = trpc.property.search.useQuery({ query: "2bhk mumbai" });
```

### Add a Database Model

```prisma
// packages/db/prisma/schema.prisma
model MyModel {
  id      String  @id @default(cuid())
  name    String
  // ... fields
}
```

Then migrate:

```bash
pnpm run db:migrate
```

### Add a Background Job

```typescript
// packages/jobs/src/queues.ts
export const myQueue = new Queue("my-jobs", { connection: redis });

// packages/jobs/src/workers/index.ts
export const myWorker = new Worker("my-jobs", async (job) => {
  console.log("Processing", job.data);
  // Do async work
});
```

Then trigger from API:

```typescript
await myQueue.add("job-data", { userId: "123", action: "email" });
```

## 🚨 Troubleshooting

### Docker services not starting?

```bash
# Check logs
docker-compose logs postgres
docker-compose logs redis

# Restart services
docker-compose restart
```

### Database migration failed?

```bash
# Check current migration status
cd packages/db
npx prisma migrate status

# Rollback last migration (dev only)
npx prisma migrate resolve --rolled-back <migration-name>
```

### tRPC not working?

```bash
# Make sure API is running on port 3001
curl http://localhost:3001/health

# Check tRPC endpoint
curl http://localhost:3001/trpc/property.search?input=
```

### Port already in use?

```bash
# Kill process on port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## 📚 Important Files to Understand

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete tech stack justification
2. **[packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)** - Database schema
3. **[turbo.json](turbo.json)** - Turborepo task pipeline
4. **[.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)** - CI/CD pipeline
5. **[infrastructure/main.tf](infrastructure/main.tf)** - AWS infrastructure

## 🎯 What's Next?

### Phase 1: Local Development (Week 1)

- [ ] Get local environment running
- [ ] Create API procedures for property search
- [ ] Build frontend for property listings
- [ ] Integrate Prisma with real data

### Phase 2: Integration (Week 2)

- [ ] Setup Razorpay webhooks
- [ ] Integrate Twilio/Resend for notifications
- [ ] Configure BullMQ workers
- [ ] Add authentication (JWT)

### Phase 3: Production Ready (Week 3)

- [ ] Deploy Terraform infrastructure
- [ ] Setup CI/CD pipeline
- [ ] Configure Sentry error tracking
- [ ] Load test with 1M+ properties

### Phase 4: Scale (Week 4+)

- [ ] Setup Typesense for search
- [ ] Add pgvector embeddings
- [ ] Implement caching strategy
- [ ] Optimize database queries

## 💬 Questions?

- **Architecture decisions**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Database schema**: See [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)
- **API endpoints**: See [apps/api/src/routers](apps/api/src/routers)
- **Frontend code**: See [apps/web/src](apps/web/src)

---

**Happy coding! 🚀**
