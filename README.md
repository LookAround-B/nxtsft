# 🏗️ NxtSft 

This repository contains the enterprise real estate platform structured as a Turborepo monorepo using **pnpm workspaces**.

For architectural details, justifications, and service breakdowns, see [ARCHITECTURE.md](ARCHITECTURE.md). For a full onboarding plan, see [QUICKSTART.md](QUICKSTART.md).

---

## 📂 Project Structure

- **`apps/web`**: Next.js 15 Frontend (Port `3000`).
- **`apps/api`**: Fastify Backend (Port `3001` / `/trpc` endpoint).
- **`packages/db`**: Prisma 6 database configuration, schemas, and seeds.
- **`packages/shared`**: Common types, schema validators (Zod), and helper utilities.
- **`packages/trpc`**: End-to-end tRPC routing and client/server adapters.
- **`packages/config`**: ESLint and configuration options.

---

## 🚦 Prerequisites

Before getting started, make sure you have installed:

- **Node.js**: `v20` or higher
- **pnpm**: `v9` or higher (`npm i -g pnpm`)
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and Typesense instances.

---

## 🚀 Step-by-Step Setup

### 1. Install Dependencies

Run the following from the root directory to install packages and configure local workspaces:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the template `.env.example` to `.env` (or `.env.local` for Next.js overrides):

```bash
cp .env.example .env
```

Ensure the connection strings for PostgreSQL, Redis, and API endpoints are correct for your local setup.

### 3. Spin Up Docker Services

Start the local PostgreSQL database, Redis cache, and Typesense search engine:

```bash
docker-compose up -d
```

> [!NOTE]
> Verify that the containers are healthy: `docker-compose ps`

### 4. Setup and Seed the Database

Generate the Prisma Client, push migrations, and seed sample data:

```bash
# Generate the Prisma client types
pnpm run db:generate

# Apply local migrations
pnpm run db:migrate

# Seed the database (optional)
cd packages/db && pnpm run db:seed && cd ../..
```

### 5. Start Development Servers

Start all workspaces (API, Web client) concurrently in hot-reload mode:

```bash
pnpm run dev
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Complete Script Reference

All scripts should be executed from the monorepo root:

| Command                | Action                                                 | Scope                 |
| :--------------------- | :----------------------------------------------------- | :-------------------- |
| `pnpm run dev`         | Start development servers for all apps                 | Next.js, Fastify      |
| `pnpm run build`       | Build all apps & packages                              | Global (Turbo-cached) |
| `pnpm run type-check`  | Run TypeScript compiler validations                    | Workspace-wide        |
| `pnpm run lint`        | Run ESLint checks                                      | Workspace-wide        |
| `pnpm run format`      | Format files using Prettier                            | Global                |
| `pnpm run db:generate` | Regenerate Prisma client                               | `@nxtsft/db`          |
| `pnpm run db:migrate`  | Apply migrations to the PostgreSQL database            | `@nxtsft/db`          |
| `pnpm run db:studio`   | Launch the Prisma graphical database browser           | `@nxtsft/db`          |
| `pnpm run clean`       | Remove all build directories, caches, and node_modules | Global                |

---

## 🔧 Developer Workflows

### Adding or Modifying a Database Model

1. Open `packages/db/prisma/schema.prisma` and perform your schema modifications.
2. Generate types and apply the migration locally:
   ```bash
   pnpm run db:migrate
   ```

### Adding a New tRPC Procedure

1. Define the input validation schema in `@nxtsft/shared` if reusable, or inline in `apps/api/src/routers`.
2. Add the query or mutation procedure in your router files inside `apps/api/src/routers/`.
3. Call the type-safe procedure in Next.js using `trpc.<router>.<procedure>.useQuery(...)`.

---

## 🚨 Troubleshooting

### Error: `ENOENT: no such file or directory, uv_cwd`

This occurs when the Node process or watcher gets orphaned because a folder was renamed or deleted.
**Resolution**:

1. Kill active terminal watch commands or background Node processes.
2. Clean lock files/cache and reinstall dependencies:
   ```bash
   pnpm run clean
   pnpm install
   ```
3. Restart development: `pnpm run dev`

### Port `3000` or `3001` Already in Use

If the Fastify API or Next.js servers crash with `EADDRINUSE`:
**Resolution**:
Find and terminate processes listening on the port:

```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Prisma Client Type Mismatches

If TypeScript complains that database types are outdated:
**Resolution**:

```bash
pnpm run db:generate
```
