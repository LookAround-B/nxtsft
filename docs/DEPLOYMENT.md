# Deploying NxtSft to Vercel

NxtSft is a pnpm/Turborepo monorepo, but only **one** app deploys: `apps/web`.
The Next.js app serves the site **and** the full API — every tRPC call hits the
relative route `/api/trpc` (a Next.js route handler running `appRouter`), and the
REST routes under `/api/v1/*` are Next.js route handlers too. Both become Vercel
**serverless functions** that talk to PostgreSQL via Prisma. The Fastify server in
`apps/api` is **not deployed** — nothing on the site uses it.

---

## One-time project setup

1. **Push to GitHub** (repo: `github.com/LookAround-B/nxtsft`), then in Vercel:
   **Add New → Project → Import** this repo.

2. **Root Directory:** set to **`apps/web`**.
   Vercel detects the pnpm workspace above it and installs from the repo root
   automatically. Leave Install Command and Build Command on their defaults —
   `next build` runs, and `prisma generate` runs via the `postinstall` script in
   `packages/db` (added for exactly this reason).

3. **Framework Preset:** Next.js (auto-detected; `apps/web/vercel.json` pins it).

4. **Environment Variables** (Project → Settings → Environment Variables):

   | Key | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | **Required.** URL-encode `@` in the password as `%40`. Use a **pooled** endpoint — see below. |
   | `NEXT_PUBLIC_POSTHOG_KEY` | `phc_…` | Optional. Baked at build time; omit to disable analytics. |

   Do **not** set `NODE_ENV` — Vercel sets it to `production` automatically.
   `NEXT_PUBLIC_API_URL` is **not needed** (the site uses relative `/api/trpc`).

5. **Deploy.** Every push to `main` redeploys; PRs get preview deployments.

---

## ⚠️ Serverless connection pooling (read before going live)

Serverless functions scale to many concurrent instances. The current DB client
(`packages/db/client.ts`) opens a `pg.Pool` **per instance** with the default max
(10), so traffic can exhaust your Postgres connection limit fast.

**Recommended before real traffic:**
- Point `DATABASE_URL` at a **pooled/transaction-mode endpoint** (PgBouncer, or your
  provider's pooler — e.g. Supabase port `6543`, Neon pooled host).
- Cap the pool per instance (e.g. `max: 1`). This needs a one-line change in
  `client.ts` (`new pg.Pool({ connectionString, max: 1 })`) — ask and I'll patch it.

For the demo/prototype phase the defaults will run, but plan this in before launch.

---

## Database migrations

Vercel builds do **not** run migrations. The schema is already pushed/seeded on the
shared remote DB. When the schema changes, apply it from your machine (or CI)
**before** the deploy that depends on it:

```bash
pnpm --filter @nxtsft/db exec prisma migrate deploy   # against production DATABASE_URL
```

---

## First-deploy checklist / things to watch

- **Prisma engine bundling:** runtime uses the `@prisma/adapter-pg` JS driver, and
  `binaryTargets` now includes `rhel-openssl-3.0.x` (Vercel's Linux). If a function
  ever logs *"Query engine library … could not be found"*, add to
  `apps/web/next.config.ts`:
  `experimental: { outputFileTracingIncludes: { '/api/**': ['../../node_modules/.pnpm/@prisma+client*/**'] } }`
- **Function region:** set the Vercel region close to the database (Project →
  Settings → Functions) to keep DB round-trips low.
- After deploy, smoke-test: `https://<domain>/api/trpc/health` (or load `/properties`
  and confirm listings render from the DB, not just static shell).

---

## Custom domain

Project → Settings → Domains → add `nxtsft.com` (and `www`). Point the registrar's
records as Vercel instructs (A/ALIAS for apex, CNAME for `www`). SSL is automatic.
