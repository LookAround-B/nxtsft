# Sprint: Agents, RERA, CRM DnD, Campaign Builder, SA Tabs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire five features from static fixtures to live PostgreSQL: agent profile pages, state-specific RERA validation, CRM kanban drag-and-drop, marketing campaign builder, and three SA portal tabs (Billing, AI Model Control, Content CMS).

**Architecture:** All five areas are additive — new Prisma models, new/extended tRPC procedures, and frontend components that replace static arrays with live queries. A single `prisma db push` covers the schema additions. No existing tables are altered destructively.

**Tech Stack:** Next.js 15 App Router · tRPC v11 · Prisma 7 · PostgreSQL (VPS) · `@hello-pangea/dnd` · Tailwind CSS 4 · Sonner toasts

## Global Constraints

- Package manager: `pnpm` only — never `npm install`
- Install packages with `pnpm add <pkg> --filter <workspace>` (e.g. `--filter @nxtsft/web`)
- No `any` types — use proper TypeScript
- No `prisma migrate dev` — use `prisma db push` (shared VPS DB, no migrations folder)
- Seed is idempotent (upsert everywhere) — safe to re-run
- All portal tab components live in `apps/web/src/components/<portal>-portal/tabs/`
- Public pages use `trpcClient` (plain client); portal tabs use `trpc` (React Query hooks)
- Commit message style: `feat: <what>` — no Co-Authored-By line

---

## File Map

| File | Action | Task |
|---|---|---|
| `packages/db/prisma/schema.prisma` | Modify — add `User.slug`, `Campaign`, `ModelVersion`, `CmsPage` | 1 |
| `packages/db/prisma/seed.ts` | Modify — agent slugs+metadata, 3 campaigns, 4 models, 5 CMS pages | 2 |
| `apps/web/src/lib/rera.ts` | Create — `validateRera(rera, city)` utility | 3 |
| `apps/web/src/app/list/page.tsx` | Modify — use `validateRera` in step 3 | 3 |
| `packages/trpc/src/routers/properties.ts` | Modify — add `validateRera` guard in `create` | 3 |
| `packages/trpc/src/routers/users.ts` | Modify — `getAgents` → public, add `getAgent(slug)` | 4 |
| `packages/trpc/src/routers/campaigns.ts` | Create — `list`, `create`, `updateStatus` | 4 |
| `packages/trpc/src/routers/superAdmin.ts` | Modify — `billingStats`, `modelVersions`, `deployModel`, `rollbackModel`, `cmsPages`, `createCmsPage`, `publishCmsPage` | 4 |
| `packages/trpc/src/index.ts` | Modify — mount `campaignsRouter` | 4 |
| `apps/web/src/app/agents/page.tsx` | Modify — add `slug` to links | 5 |
| `apps/web/src/app/agents/[slug]/page.tsx` | Modify — replace fixture with `trpcClient.users.getAgent` | 5 |
| `apps/web/src/components/admin-portal/tabs/CRMTab.tsx` | Modify — add DnD, remove Select dropdown | 6 |
| `apps/web/src/components/admin-portal/tabs/MarketingTab.tsx` | Modify — live DB + create modal | 7 |
| `apps/web/src/components/sa-portal/tabs/BillingTab.tsx` | Modify — live `billingStats` query | 8 |
| `apps/web/src/components/sa-portal/tabs/AITab.tsx` | Modify — live `modelVersions` + deploy/rollback | 9 |
| `apps/web/src/components/sa-portal/tabs/CMSTab.tsx` | Modify — live `cmsPages` + create modal | 10 |

---

## Task 1: Schema additions + DB push

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Interfaces:**
- Produces: `User.slug`, `Campaign`, `ModelVersion`, `CmsPage` models available in Prisma client

- [ ] **Step 1: Add `slug` to User and four new models to schema**

In `packages/db/prisma/schema.prisma`, make these changes:

Add `slug` field to the `User` model (after the `role` field):
```prisma
slug         String?  @unique
```

Add `campaigns` and `cmsPages` relations to the `User` model (after the `tickets` relation):
```prisma
campaigns    Campaign[]
cmsPages     CmsPage[]
```

Add these three new models at the bottom of the file (before the closing):

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// MARKETING CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

model Campaign {
  id          String   @id @default(cuid())
  name        String
  type        String   @default("email") // email | sms | whatsapp
  audience    String   @default("all")   // all | user | sales | admin
  subject     String?
  body        String?  @db.Text
  status      String   @default("draft") // draft | scheduled | active | paused | completed
  budget      Int?     // rupees
  leads       Int      @default(0)
  clicks      Int      @default(0)
  scheduledAt DateTime?
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([createdById])
}

// ═══════════════════════════════════════════════════════════════════════════
// AI MODEL VERSIONS
// ═══════════════════════════════════════════════════════════════════════════

model ModelVersion {
  id         String    @id @default(cuid())
  name       String    @unique
  purpose    String
  drift      Float     @default(0)
  accuracy   Float     @default(0)
  status     String    @default("inactive") // live | canary | inactive
  deployedAt DateTime?
  createdAt  DateTime  @default(now())

  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT CMS PAGES
// ═══════════════════════════════════════════════════════════════════════════

model CmsPage {
  id          String    @id @default(cuid())
  title       String
  path        String    @unique
  status      String    @default("draft") // draft | published | scheduled
  body        String?   @db.Text
  scheduledAt DateTime?
  editorId    String
  editor      User      @relation(fields: [editorId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([status])
  @@index([editorId])
}
```

- [ ] **Step 2: Push schema to VPS**

```bash
pnpm --filter @nxtsft/db prisma db push
```

Expected output: `✓ Your database is now in sync with your Prisma schema.`

If it shows a warning about `User.slug` nullable unique — that's expected (existing rows get NULL, which doesn't violate the unique constraint).

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
pnpm --filter @nxtsft/db prisma generate
```

Expected: no errors. The new models (`Campaign`, `ModelVersion`, `CmsPage`) should now be accessible via `prisma.campaign`, `prisma.modelVersion`, `prisma.cmsPage`.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add slug to User, Campaign, ModelVersion, CmsPage models"
```

---

## Task 2: Seed — agent slugs, metadata, demo data

**Files:**
- Modify: `packages/db/prisma/seed.ts`

**Interfaces:**
- Consumes: new `User.slug` field, `Campaign`, `ModelVersion`, `CmsPage` models from Task 1
- Produces: 15 agents with slugs + full metadata, 3 campaigns, 4 model versions, 5 CMS pages in DB

- [ ] **Step 1: Update agent upserts to include slug and full metadata**

In `packages/db/prisma/seed.ts`, replace the `agents` array and its upsert loop with:

```typescript
const agents = [
  { email: "priya.sharma.agent@nxtsft.com", name: "Priya Sharma", slug: "priya-sharma", initials: "PS", rating: 4.9, reviews: 87, deals: 142, since: 2018, listings: 8, featured: true, color: "bg-accent", responseTime: "< 30 min", portfolioValue: "₹45 Cr+", specialties: ["Residential", "Luxury Apartments"], languages: ["English", "Hindi", "Marathi"], cities: ["Mumbai", "Pune"] },
  { email: "karan.joshi.agent@nxtsft.com", name: "Karan Joshi", slug: "karan-joshi", initials: "KJ", rating: 4.8, reviews: 63, deals: 98, since: 2019, listings: 6, featured: false, color: "bg-mid-blue", responseTime: "< 1 hr", portfolioValue: "₹32 Cr+", specialties: ["Tech Parks", "Commercial"], languages: ["English", "Hindi", "Kannada"], cities: ["Bengaluru", "Hyderabad"] },
  { email: "devansh.patel.agent@nxtsft.com", name: "Devansh Patel", slug: "devansh-patel", initials: "DP", rating: 4.6, reviews: 41, deals: 67, since: 2017, listings: 5, featured: false, color: "bg-navy", responseTime: "< 2 hrs", portfolioValue: "₹28 Cr+", specialties: ["Plots", "Villas"], languages: ["English", "Hindi", "Gujarati"], cities: ["Ahmedabad", "Surat"] },
  { email: "meera.krishnan@nxtsft.com", name: "Meera Krishnan", slug: "meera-krishnan", initials: "MK", rating: 4.9, reviews: 96, deals: 161, since: 2015, listings: 10, featured: true, color: "bg-emerald-600", responseTime: "< 30 min", portfolioValue: "₹62 Cr+", specialties: ["Luxury Villas", "Waterfront"], languages: ["English", "Malayalam", "Tamil"], cities: ["Kochi", "Chennai"] },
  { email: "anita.rao.agent@nxtsft.com", name: "Anita Rao", slug: "anita-rao", initials: "AR", rating: 4.7, reviews: 34, deals: 54, since: 2020, listings: 4, featured: false, color: "bg-purple-600", responseTime: "< 1 hr", portfolioValue: "₹18 Cr+", specialties: ["Apartments", "PG/Co-living"], languages: ["English", "Telugu", "Hindi"], cities: ["Hyderabad", "Pune"] },
  { email: "rohit.mehra@nxtsft.com", name: "Rohit Mehra", slug: "rohit-mehra", initials: "RM", rating: 4.8, reviews: 72, deals: 119, since: 2016, listings: 7, featured: true, color: "bg-amber-600", responseTime: "< 45 min", portfolioValue: "₹51 Cr+", specialties: ["Gated Communities", "Builder Floors"], languages: ["English", "Hindi", "Punjabi"], cities: ["Delhi NCR", "Gurgaon", "Noida"] },
  { email: "lakshmi.nair@nxtsft.com", name: "Lakshmi Nair", slug: "lakshmi-nair", initials: "LN", rating: 4.7, reviews: 58, deals: 83, since: 2019, listings: 5, featured: false, color: "bg-rose-600", responseTime: "< 1 hr", portfolioValue: "₹29 Cr+", specialties: ["Apartments", "Rentals"], languages: ["English", "Malayalam", "Hindi"], cities: ["Kochi", "Bengaluru"] },
  { email: "arjun.kapoor@nxtsft.com", name: "Arjun Kapoor", slug: "arjun-kapoor", initials: "AK", rating: 4.5, reviews: 45, deals: 76, since: 2018, listings: 6, featured: false, color: "bg-teal-600", responseTime: "< 2 hrs", portfolioValue: "₹24 Cr+", specialties: ["Studio Apartments", "Co-living"], languages: ["English", "Hindi"], cities: ["Mumbai", "Pune"] },
  { email: "vijay.deshmukh@nxtsft.com", name: "Vijay Deshmukh", slug: "vijay-deshmukh", initials: "VD", rating: 4.6, reviews: 52, deals: 94, since: 2017, listings: 7, featured: false, color: "bg-indigo-600", responseTime: "< 1 hr", portfolioValue: "₹38 Cr+", specialties: ["Bungalows", "Row Houses"], languages: ["English", "Hindi", "Marathi"], cities: ["Pune", "Mumbai"] },
  { email: "fatima.sheikh@nxtsft.com", name: "Fatima Sheikh", slug: "fatima-sheikh", initials: "FS", rating: 4.8, reviews: 67, deals: 108, since: 2018, listings: 9, featured: true, color: "bg-fuchsia-600", responseTime: "< 30 min", portfolioValue: "₹44 Cr+", specialties: ["Premium Apartments", "New Launches"], languages: ["English", "Urdu", "Hindi"], cities: ["Mumbai", "Bengaluru"] },
  { email: "gaurav.singh@nxtsft.com", name: "Gaurav Singh", slug: "gaurav-singh", initials: "GS", rating: 4.5, reviews: 38, deals: 52, since: 2020, listings: 4, featured: false, color: "bg-orange-600", responseTime: "< 2 hrs", portfolioValue: "₹16 Cr+", specialties: ["Affordable Homes", "Plots"], languages: ["English", "Hindi"], cities: ["Jaipur", "Lucknow"] },
  { email: "divya.menon@nxtsft.com", name: "Divya Menon", slug: "divya-menon", initials: "DM", rating: 4.7, reviews: 43, deals: 71, since: 2019, listings: 5, featured: false, color: "bg-cyan-600", responseTime: "< 1 hr", portfolioValue: "₹22 Cr+", specialties: ["Villas", "Farmhouses"], languages: ["English", "Malayalam", "Tamil"], cities: ["Chennai", "Kochi"] },
  { email: "pooja.agarwal@nxtsft.com", name: "Pooja Agarwal", slug: "pooja-agarwal", initials: "PA", rating: 4.6, reviews: 55, deals: 88, since: 2018, listings: 6, featured: false, color: "bg-pink-600", responseTime: "< 1 hr", portfolioValue: "₹33 Cr+", specialties: ["Residential", "Luxury"], languages: ["English", "Hindi"], cities: ["Delhi NCR", "Noida"] },
  { email: "amit.bhatt@nxtsft.com", name: "Amit Bhatt", slug: "amit-bhatt", initials: "AB", rating: 4.4, reviews: 29, deals: 45, since: 2021, listings: 3, featured: false, color: "bg-lime-600", responseTime: "< 3 hrs", portfolioValue: "₹12 Cr+", specialties: ["Apartments", "Investment Properties"], languages: ["English", "Hindi", "Gujarati"], cities: ["Ahmedabad", "Vadodara"] },
  { email: "suresh.iyer@nxtsft.com", name: "Suresh Iyer", slug: "suresh-iyer", initials: "SI", rating: 5.0, reviews: 4, deals: 1, since: 2024, listings: 1, featured: false, color: "bg-slate-600", responseTime: "< 4 hrs", portfolioValue: "₹2 Cr+", specialties: ["Apartments"], languages: ["English", "Tamil"], cities: ["Chennai"] },
];

for (const agent of agents) {
  const { slug, initials, rating, reviews, deals, since, listings, featured, color, responseTime, portfolioValue, specialties, languages, cities, ...userFields } = agent;
  await prisma.user.upsert({
    where: { email: agent.email },
    update: {
      slug,
      metadata: { initials, rating, reviews, deals, since, listings, featured, color, responseTime, portfolioValue, specialties, languages, cities },
    },
    create: {
      ...userFields,
      slug,
      city: cities[0] ?? "Mumbai",
      role: "agent",
      verified: true,
      passwordHash: hash,
      metadata: { initials, rating, reviews, deals, since, listings, featured, color, responseTime, portfolioValue, specialties, languages, cities },
    },
  });
}
console.log(`✓ Seeded ${agents.length} agents with slugs`);
```

- [ ] **Step 2: Add demo campaigns, model versions, and CMS pages**

At the end of `seed.ts`, before the `main().catch(...)` call, add:

```typescript
  // ── Demo campaigns ────────────────────────────────────────────────────────
  const sa = uid("sa@nxtsft.com");
  const adminUser = uid("admin@nxtsft.com");
  const campaignSeed = [
    { id: "seed-camp-01", name: "Bandra Premium — Google", type: "email", audience: "user", subject: "Exclusive 3 BHK in Bandra West", body: "Discover sea-facing apartments starting at ₹6.5 Cr.", status: "active", budget: 240000, leads: 64, clicks: 4820, createdById: adminUser },
    { id: "seed-camp-02", name: "Whitefield Villa — Meta", type: "whatsapp", audience: "user", subject: "4 BHK Villas in Whitefield", body: "Ready-to-move villas from ₹4.2 Cr in Bengaluru's IT hub.", status: "active", budget: 180000, leads: 41, clicks: 3210, createdById: adminUser },
    { id: "seed-camp-03", name: "Pune Rentals — SMS Blast", type: "sms", audience: "all", subject: null, body: "2 BHK furnished in Koregaon Park at ₹55K/mo. Call now!", status: "paused", budget: 60000, leads: 28, clicks: 1240, createdById: adminUser },
  ];
  for (const c of campaignSeed) {
    await prisma.campaign.upsert({ where: { id: c.id }, update: c, create: { id: c.id, ...c } });
  }
  console.log(`✓ Seeded ${campaignSeed.length} campaigns`);

  // ── AI model versions ─────────────────────────────────────────────────────
  const modelSeed = [
    { id: "seed-model-01", name: "nxtsft-match-v3", purpose: "Property Match", drift: 0.4, accuracy: 94.2, status: "live", deployedAt: new Date("2026-05-01") },
    { id: "seed-model-02", name: "nxtsft-price-v2", purpose: "Price Estimator", drift: 1.1, accuracy: 88.6, status: "live", deployedAt: new Date("2026-04-15") },
    { id: "seed-model-03", name: "nxtsft-lead-score", purpose: "Lead Scoring", drift: 0.8, accuracy: 91.0, status: "live", deployedAt: new Date("2026-03-20") },
    { id: "seed-model-04", name: "nxtsft-recommend", purpose: "Recommendations", drift: 2.3, accuracy: 82.4, status: "canary", deployedAt: new Date("2026-06-10") },
  ];
  for (const m of modelSeed) {
    await prisma.modelVersion.upsert({ where: { id: m.id }, update: m, create: { id: m.id, ...m } });
  }
  console.log(`✓ Seeded ${modelSeed.length} model versions`);

  // ── CMS pages ─────────────────────────────────────────────────────────────
  const cmsSeed = [
    { id: "seed-cms-01", title: "Home Hero Carousel", path: "/", status: "published", body: "Hero carousel content for the NxtSft home page.", editorId: sa },
    { id: "seed-cms-02", title: "About — Leadership", path: "/about", status: "published", body: "Leadership team bios and company story.", editorId: adminUser },
    { id: "seed-cms-03", title: "Contact", path: "/contact", status: "published", body: "Contact form and office address.", editorId: adminUser },
    { id: "seed-cms-04", title: "Blog: Mumbai 2026 Outlook", path: "/blog/mumbai-2026", status: "draft", body: "Analysis of Mumbai real estate trends for 2026.", editorId: priya },
    { id: "seed-cms-05", title: "Builder Co-marketing", path: "/builders", status: "scheduled", body: "Builder partnership landing page.", editorId: priya, scheduledAt: new Date(Date.now() + 2 * 86_400_000) },
  ];
  for (const p of cmsSeed) {
    await prisma.cmsPage.upsert({ where: { id: p.id }, update: p, create: { id: p.id, ...p } });
  }
  console.log(`✓ Seeded ${cmsSeed.length} CMS pages`);
```

- [ ] **Step 3: Run seed**

```bash
pnpm --filter @nxtsft/db db:seed
```

Expected output includes:
```
✓ Seeded 15 agents with slugs
✓ Seeded 3 campaigns
✓ Seeded 4 model versions
✓ Seeded 5 CMS pages
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat: seed agent slugs, campaigns, model versions, CMS pages"
```

---

## Task 3: RERA validation utility

**Files:**
- Create: `apps/web/src/lib/rera.ts`
- Modify: `apps/web/src/app/list/page.tsx` (lines 180–186)
- Modify: `packages/trpc/src/routers/properties.ts` (inside `create` procedure)

**Interfaces:**
- Produces: `validateRera(rera: string, city: string): string | null`

- [ ] **Step 1: Create `apps/web/src/lib/rera.ts`**

```typescript
const CITY_STATE: Record<string, string> = {
  Mumbai: "Maharashtra",
  Pune: "Maharashtra",
  Bengaluru: "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
  "Delhi NCR": "Delhi",
  Noida: "Uttar Pradesh",
  Gurgaon: "Haryana",
  Ahmedabad: "Gujarat",
  Surat: "Gujarat",
  Kolkata: "West Bengal",
  Kochi: "Kerala",
  Jaipur: "Rajasthan",
  Lucknow: "Uttar Pradesh",
};

const STATE_PATTERNS: Record<string, RegExp> = {
  Maharashtra: /^P\d{11}$/,
  Karnataka: /^PRM\/KA\/RERA\//i,
  Telangana: /^P024\d{8}$/,
  Delhi: /^DLRERA\d{4}[A-Z]\d{4}$/,
  "Uttar Pradesh": /^UPRERAPRJ\d{7}$/,
  Haryana: /^GGM\//i,
  "Tamil Nadu": /^TN\/29\//i,
  "West Bengal": /^WBRERA\//i,
  Rajasthan: /^RAJ\//i,
  Kerala: /^K-RERA\//i,
  Gujarat: /^PR\/GJ\//i,
  "Andhra Pradesh": /^AP\//i,
};

const FALLBACK = /^[A-Za-z0-9\/\-]+$/;

export function validateRera(rera: string, city: string): string | null {
  const trimmed = rera.trim();
  if (!trimmed) return "RERA registration number is required";
  const state = CITY_STATE[city] ?? "";
  const pattern = STATE_PATTERNS[state] ?? FALLBACK;
  if (!pattern.test(trimmed)) {
    return state && STATE_PATTERNS[state]
      ? `Invalid RERA format for ${state}. Check your state RERA portal for the correct format.`
      : "Invalid RERA registration number format";
  }
  return null;
}
```

- [ ] **Step 2: Update step 3 validation in `/list` page**

In `apps/web/src/app/list/page.tsx`, add the import at the top:
```typescript
import { validateRera } from "@/lib/rera";
```

Replace lines 180–186 (the RERA validation block inside `validate`):
```typescript
    if (s === 3) {
      if (!data.description.trim()) e.description = "Add a brief description";
      const reraError = validateRera(data.rera, data.city);
      if (reraError) e.rera = reraError;
    }
```

- [ ] **Step 3: Add server-side guard in `properties.create`**

In `packages/trpc/src/routers/properties.ts`, add the import at the top of the file (adjust path — this is a backend package, so use a direct import of the same logic):

Add a local inline version of `validateRera` in `properties.ts` (the frontend lib isn't importable from the trpc package):

```typescript
// State-specific RERA patterns — kept in sync with apps/web/src/lib/rera.ts
const CITY_STATE: Record<string, string> = {
  Mumbai: "Maharashtra", Pune: "Maharashtra", Bengaluru: "Karnataka",
  Hyderabad: "Telangana", Chennai: "Tamil Nadu", "Delhi NCR": "Delhi",
  Noida: "Uttar Pradesh", Gurgaon: "Haryana", Ahmedabad: "Gujarat",
  Surat: "Gujarat", Kolkata: "West Bengal", Kochi: "Kerala",
  Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh",
};
const STATE_PATTERNS: Record<string, RegExp> = {
  Maharashtra: /^P\d{11}$/, Karnataka: /^PRM\/KA\/RERA\//i,
  Telangana: /^P024\d{8}$/, Delhi: /^DLRERA\d{4}[A-Z]\d{4}$/,
  "Uttar Pradesh": /^UPRERAPRJ\d{7}$/, Haryana: /^GGM\//i,
  "Tamil Nadu": /^TN\/29\//i, "West Bengal": /^WBRERA\//i,
  Rajasthan: /^RAJ\//i, Kerala: /^K-RERA\//i, Gujarat: /^PR\/GJ\//i,
  "Andhra Pradesh": /^AP\//i,
};
function validateRera(rera: string, city: string): string | null {
  const t = rera.trim();
  if (!t) return "RERA number required";
  const pat = STATE_PATTERNS[CITY_STATE[city] ?? ""] ?? /^[A-Za-z0-9\/\-]+$/;
  return pat.test(t) ? null : "Invalid RERA format for this state";
}
```

Inside the `create` mutation handler, after input parsing and before the `prisma.property.create` call, add:
```typescript
      if (input.rera) {
        const reraError = validateRera(input.rera, input.city ?? "");
        if (reraError) throw new TRPCError({ code: "BAD_REQUEST", message: reraError });
      }
```

- [ ] **Step 4: Verify build**

```bash
pnpm --filter @nxtsft/web build
```

Expected: zero TypeScript errors. Fix any type errors before continuing.

- [ ] **Step 5: Manual verify**

Start dev server: `pnpm dev`
- Go to `/list`, fill step 1 (select Owner), step 2 (select Mumbai, fill price/area/BHK)
- Step 3: enter `INVALID` in RERA field → should show: `Invalid RERA format for Maharashtra. Check your state RERA portal...`
- Enter `P51800123456` (11 digits after P) → error should clear, Next button proceeds

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/rera.ts apps/web/src/app/list/page.tsx packages/trpc/src/routers/properties.ts
git commit -m "feat: state-specific RERA validation on /list and properties.create"
```

---

## Task 4: tRPC — agents, campaigns, SA procedures

**Files:**
- Modify: `packages/trpc/src/routers/users.ts`
- Create: `packages/trpc/src/routers/campaigns.ts`
- Modify: `packages/trpc/src/routers/superAdmin.ts`
- Modify: `packages/trpc/src/index.ts`

**Interfaces:**
- Produces:
  - `trpc.users.getAgents` → `publicProcedure` returning `AgentRow[]` with `slug`
  - `trpc.users.getAgent({ slug })` → single `AgentRow | null`
  - `trpc.campaigns.list` → `Campaign[]`
  - `trpc.campaigns.create` → `Campaign`
  - `trpc.campaigns.updateStatus` → `Campaign`
  - `trpc.superAdmin.billingStats` → `{ mrr, arr, outstanding, outstandingCount, recentPayments }`
  - `trpc.superAdmin.modelVersions` → `ModelVersion[]`
  - `trpc.superAdmin.deployModel({ id })` → `ModelVersion`
  - `trpc.superAdmin.rollbackModel({ id })` → `ModelVersion`
  - `trpc.superAdmin.cmsPages` → `CmsPageRow[]`
  - `trpc.superAdmin.createCmsPage(...)` → `CmsPage`
  - `trpc.superAdmin.publishCmsPage({ id })` → `CmsPage`

- [ ] **Step 1: Update `users.ts` — make `getAgents` public, add `getAgent`**

In `packages/trpc/src/routers/users.ts`, replace the `getAgents` procedure:

```typescript
  getAgents: publicProcedure.query(async () => {
    const agents = await prisma.user.findMany({
      where: { role: "agent" },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        avatar: true,
        city: true,
        verified: true,
        metadata: true,
      },
      orderBy: { name: "asc" },
    });
    return agents.map((a) => ({
      ...a,
      ...((a.metadata as Record<string, unknown>) ?? {}),
    }));
  }),

  getAgent: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const agent = await prisma.user.findFirst({
        where: { slug: input.slug, role: "agent" },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          avatar: true,
          city: true,
          verified: true,
          metadata: true,
        },
      });
      if (!agent) return null;
      return { ...agent, ...((agent.metadata as Record<string, unknown>) ?? {}) };
    }),
```

Make sure `publicProcedure` is imported from `"../server.js"` at the top of users.ts (it should already be).

- [ ] **Step 2: Create `packages/trpc/src/routers/campaigns.ts`**

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, adminProcedure } from "../server.js";
import { safeString } from "../sanitize.js";

export const campaignsRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.campaign.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: safeString,
        type: z.enum(["email", "sms", "whatsapp"]),
        audience: z.enum(["all", "user", "sales", "admin"]).default("all"),
        subject: safeString.optional(),
        body: z.string().max(5000).optional(),
        budget: z.number().int().positive().optional(),
        scheduledAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.campaign.create({
        data: {
          ...input,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          status: input.scheduledAt ? "scheduled" : "draft",
          createdById: ctx.user.id,
        },
      });
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["draft", "scheduled", "active", "paused", "completed"]),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
```

- [ ] **Step 3: Mount campaigns router in `packages/trpc/src/index.ts`**

Add import:
```typescript
import { campaignsRouter } from "./routers/campaigns.js";
```

Add to `appRouter`:
```typescript
  campaigns: campaignsRouter,
```

- [ ] **Step 4: Add SA procedures to `superAdmin.ts`**

At the end of the `superAdminRouter` object (before the closing `}`), add:

```typescript
  billingStats: superAdminProcedure.query(async () => {
    const [activeSubs, failedSubs, recentPayments] = await Promise.all([
      prisma.subscription.findMany({ where: { status: "Active" } }),
      prisma.subscription.findMany({
        where: { status: { in: ["Failed", "Expired"] } },
      }),
      prisma.payment.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      }),
    ]);

    const mrr = activeSubs.reduce((s, sub) => s + Number(sub.amount), 0) / 100;

    return {
      mrr,
      arr: mrr * 12,
      outstanding: failedSubs.reduce((s, sub) => s + Number(sub.amount), 0) / 100,
      outstandingCount: failedSubs.length,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        userName: p.user.name,
        amount: Number(p.amount) / 100,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt,
      })),
    };
  }),

  modelVersions: superAdminProcedure.query(async () => {
    return prisma.modelVersion.findMany({ orderBy: { createdAt: "desc" } });
  }),

  deployModel: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.modelVersion.update({
        where: { id: input.id },
        data: { status: "live", deployedAt: new Date() },
      });
    }),

  rollbackModel: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.modelVersion.update({
        where: { id: input.id },
        data: { status: "inactive" },
      });
    }),

  cmsPages: superAdminProcedure.query(async () => {
    return prisma.cmsPage.findMany({
      include: { editor: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  createCmsPage: superAdminProcedure
    .input(
      z.object({
        title: safeString,
        path: z.string().startsWith("/").max(200),
        body: z.string().max(50000).optional(),
        scheduledAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.cmsPage.create({
        data: {
          title: input.title,
          path: input.path,
          body: input.body ?? null,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          status: input.scheduledAt ? "scheduled" : "draft",
          editorId: ctx.user.id,
        },
      });
    }),

  publishCmsPage: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.cmsPage.update({
        where: { id: input.id },
        data: { status: "published", scheduledAt: null },
      });
    }),
```

Make sure `safeString` is already imported at the top of `superAdmin.ts` (it is — check the existing imports).

- [ ] **Step 5: Type-check**

```bash
pnpm --filter @nxtsft/trpc tsc --noEmit
```

Expected: zero errors. Fix any import or type mismatches.

- [ ] **Step 6: Commit**

```bash
git add packages/trpc/src/routers/users.ts packages/trpc/src/routers/campaigns.ts packages/trpc/src/routers/superAdmin.ts packages/trpc/src/index.ts
git commit -m "feat: getAgents public + getAgent(slug), campaigns router, SA billing/AI/CMS procedures"
```

---

## Task 5: Agent pages → live DB

**Files:**
- Modify: `apps/web/src/app/agents/page.tsx`
- Modify: `apps/web/src/app/agents/[slug]/page.tsx`

**Interfaces:**
- Consumes: `trpc.users.getAgents` (public), `trpc.users.getAgent({ slug })` from Task 4

- [ ] **Step 1: Update `agents/page.tsx` — add `slug` to card links**

The page already fetches agents via `trpcClient.users.getAgents.query()`. The card renders a link to the agent profile. Find the card component (around line 81) and find the `Link` that goes to the agent detail page. It currently uses `ownerSlug(agent.name)` — replace it with `agent.slug ?? ownerSlug(agent.name)`.

Search for any `href` pointing to `/agents/` in the file and update to use `agent.slug`:
```typescript
href={`/agents/${agent.slug ?? ownerSlug(agent.name)}`}
```

Also remove the `ownerSlug` import if it becomes unused after this change (check the full file).

- [ ] **Step 2: Rewrite `agents/[slug]/page.tsx`**

Replace the entire file content with:

```typescript
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import {
  Star, Phone, MessageCircle, Lock, ShieldCheck, MapPin, Globe,
  Award, ArrowLeft, Clock, TrendingUp, Building2, CheckCircle2,
} from "lucide-react";
import { trpcClient } from "@/lib/trpcClient";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type AgentRow = {
  id: string; name: string; slug: string | null; city: string; verified: boolean;
  initials?: string; rating?: number; reviews?: number; deals?: number; since?: number;
  listings?: number; featured?: boolean; color?: string; responseTime?: string;
  portfolioValue?: string; specialties?: string[]; languages?: string[]; cities?: string[];
  role?: string;
};

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size}
          className={i <= Math.round(n) ? "fill-amber-400 text-amber-400" : "fill-border text-border"} />
      ))}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 text-center">
      <div className="font-display text-2xl font-black text-navy">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AgentProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null | undefined>(undefined);

  useEffect(() => {
    trpcClient.users.getAgent.query({ slug }).then(setAgent).catch(() => setAgent(null));
  }, [slug]);

  if (agent === undefined) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!agent) { notFound(); return null; }

  const yrs = new Date().getFullYear() - (agent.since ?? new Date().getFullYear());
  const color = agent.color ?? "bg-accent";
  const cities = agent.cities ?? [agent.city];
  const specialties = agent.specialties ?? [];
  const languages = agent.languages ?? [];

  const handleContact = (channel: "phone" | "whatsapp") => {
    if (!session) { toast.error("Sign in required", { description: `Sign in to contact ${agent.name}.` }); return; }
    toast.success(channel === "phone" ? "Connecting…" : "Opening WhatsApp…", {
      description: channel === "phone" ? `Calling ${agent.name}.` : `Connecting you with ${agent.name}.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-accent">Home</Link>
            <span>/</span>
            <Link href="/agents" className="hover:text-accent">Agents</Link>
            <span>/</span>
            <span className="font-semibold text-navy">{agent.name}</span>
          </div>
          <Link href="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-accent">
            <ArrowLeft size={14} /> Back to agents
          </Link>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className={`flex h-24 w-24 items-center justify-center rounded-3xl font-display text-3xl font-black text-white sm:h-28 sm:w-28 ${color}`}>
                {agent.initials ?? agent.name[0]}
              </div>
              {agent.verified && (
                <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent shadow">
                  <ShieldCheck size={14} className="text-white" strokeWidth={2.5} />
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">{agent.name}</h1>
                {agent.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy">
                    <Award size={10} /> Featured
                  </span>
                )}
                {agent.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                    <ShieldCheck size={10} /> RERA Verified
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Senior RERA Agent · Partner since {agent.since}</div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Stars n={agent.rating ?? 0} size={15} />
                  <span className="font-display text-base font-bold text-navy">{agent.rating}</span>
                  <span className="text-sm text-muted-foreground">({agent.reviews} reviews)</span>
                </div>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={13} /> Replies {agent.responseTime ?? "within 24 hrs"}
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground/70">{cities.join(" · ")}</span>
              </div>
              <div className="mt-1.5 flex items-start gap-2">
                <Globe size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground/70">{languages.join(" · ")}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {session ? (
                <>
                  <button onClick={() => handleContact("phone")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:w-auto">
                    <Phone size={15} /> Call Agent
                  </button>
                  <button onClick={() => handleContact("whatsapp")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/25 transition hover:opacity-90 sm:w-auto">
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                </>
              ) : (
                <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90">
                  <Lock size={14} /> Sign in to contact
                </Link>
              )}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Closed Deals" value={String(agent.deals ?? 0)} />
            <Stat label="Years Experience" value={`${yrs} yrs`} />
            <Stat label="Portfolio Value" value={agent.portfolioValue ?? "—"} />
            <Stat label="Active Listings" value={String(agent.listings ?? 0)} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-navy">Browse live listings</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {agent.name.split(" ")[0]} has closed {agent.deals ?? 0} deals. View available properties on the listings page.
              </p>
              <Link href="/properties" className="mt-4 inline-block rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white transition hover:opacity-90">
                Browse Properties →
              </Link>
            </div>
          </div>
          <div className="space-y-5">
            {specialties.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-5">
                <h3 className="mb-3 font-display text-base font-bold text-navy">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <span key={s} className="rounded-full border border-accent/20 bg-accent/6 px-3 py-1 text-xs font-semibold text-accent">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {cities.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-5">
                <h3 className="mb-3 font-display text-base font-bold text-navy">Cities Covered</h3>
                <ul className="space-y-2">
                  {cities.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-sm text-foreground/75">
                      <MapPin size={12} className="shrink-0 text-accent" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {languages.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-5">
                <h3 className="mb-3 font-display text-base font-bold text-navy">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {languages.map((l) => (
                    <span key={l} className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-semibold text-navy">{l}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-border bg-white p-5">
              <h3 className="mb-3 font-display text-base font-bold text-navy">Why work with {agent.name.split(" ")[0]}?</h3>
              <ul className="space-y-2.5">
                {[
                  `${agent.deals ?? 0} successful transactions`,
                  `${yrs} years of market expertise`,
                  agent.verified ? "RERA certified & verified" : "Active NxtSft.com partner",
                  `Replies within ${agent.responseTime ?? "24 hrs"}`,
                  `Portfolio value: ${agent.portfolioValue ?? "Available on request"}`,
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-foreground/75">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />{point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-accent/20 bg-navy p-5 text-white">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp size={14} className="text-gold" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold">Get in Touch</span>
              </div>
              <p className="mt-2 text-sm text-white/75">Ready to buy, sell or rent? {agent.name.split(" ")[0]} is available to help.</p>
              {session ? (
                <button onClick={() => handleContact("whatsapp")} className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90">Contact Now</button>
              ) : (
                <Link href="/login" className="mt-4 block w-full rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90">Sign in to contact</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
pnpm --filter @nxtsft/web build
```

Expected: zero errors.

- [ ] **Step 4: Manual verify**

- Go to `/agents` — cards should load from DB, each linking to `/agents/<slug>`
- Click any agent card → `/agents/priya-sharma` should show Priya's profile from DB data (rating 4.9, 142 deals, cities Mumbai/Pune, specialties Residential/Luxury Apartments)
- Go to `/agents/nonexistent` → should show Next.js 404 page

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/agents/page.tsx apps/web/src/app/agents/[slug]/page.tsx
git commit -m "feat: agent profile pages now load from DB via getAgent(slug)"
```

---

## Task 6: CRM kanban drag-and-drop

**Files:**
- Modify: `apps/web/src/components/admin-portal/tabs/CRMTab.tsx`

**Interfaces:**
- Consumes: existing `trpc.admin.leads.list`, `trpc.leads.updateStatus` (unchanged)

- [ ] **Step 1: Install `@hello-pangea/dnd`**

```bash
pnpm add @hello-pangea/dnd --filter @nxtsft/web
```

- [ ] **Step 2: Replace `CRMTab.tsx` with DnD version**

Replace the entire file:

```typescript
"use client";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

const CRM_STAGES = ["New", "Hot", "Warm", "Cold", "Converted", "Lost"] as const;
type CrmStage = (typeof CRM_STAGES)[number];

const stageAccent: Record<CrmStage, string> = {
  New: "border-t-sky-400",
  Hot: "border-t-red-500",
  Warm: "border-t-amber-500",
  Cold: "border-t-blue-400",
  Converted: "border-t-emerald-500",
  Lost: "border-t-zinc-400",
};

const stageBadge: Record<CrmStage, "new" | "hot" | "warm" | "cold" | "success" | "default"> = {
  New: "new", Hot: "hot", Warm: "warm", Cold: "cold", Converted: "success", Lost: "default",
};

type CrmLead = {
  id: string;
  name: string;
  city: string | null;
  status: string;
  value: number | null;
  interest: string | null;
  property: { id: string; title: string; slug: string } | null;
};

export function CRMTab() {
  const leadsQ = trpc.admin.leads.list.useQuery({ limit: 100 });
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const serverLeads = (leadsQ.data?.items ?? []) as unknown as CrmLead[];

  // Local copy for optimistic DnD updates
  const [leads, setLeads] = useState<CrmLead[]>([]);
  useEffect(() => { setLeads(serverLeads); }, [leadsQ.data]);

  const fmtValue = (v: number | null) =>
    v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStage = destination.droppableId as CrmStage;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.status === newStage) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === draggableId ? { ...l, status: newStage } : l));

    updateStatus.mutate(
      { id: draggableId, status: newStage },
      {
        onSuccess: () => toast.success(`Moved to ${newStage}`),
        onError: () => {
          // Revert on error
          setLeads((prev) => prev.map((l) => l.id === draggableId ? { ...l, status: lead.status } : l));
        },
      },
    );
  };

  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Drag a lead card between columns to move it through the funnel." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">{leads.length} leads</Badge>}>
        {leadsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading pipeline…</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {CRM_STAGES.map((stage) => {
                const items = leads.filter((l) => l.status === stage);
                return (
                  <div key={stage} className={`rounded-lg border-t-4 bg-secondary/60 p-3 ${stageAccent[stage]}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-navy">{stage}</span>
                      <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
                    </div>
                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[60px] space-y-2 rounded-md transition-colors ${snapshot.isDraggingOver ? "bg-accent/8" : ""}`}
                        >
                          {items.map((l, idx) => (
                            <Draggable key={l.id} draggableId={l.id} index={idx}>
                              {(drag, dragSnapshot) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  className={`rounded-md bg-white p-2.5 text-xs shadow-sm cursor-grab active:cursor-grabbing select-none transition-shadow ${dragSnapshot.isDragging ? "shadow-lg rotate-1 opacity-95" : ""}`}
                                >
                                  <div className="font-semibold leading-tight text-navy">{l.name}</div>
                                  <div className="mt-0.5 flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">{l.city ?? "—"}</span>
                                    <span className="font-mono text-[10px] font-bold text-accent">{fmtValue(l.value)}</span>
                                  </div>
                                  {l.property && (
                                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.property.title}</div>
                                  )}
                                  <div className="mt-1.5">
                                    <Badge tone={stageBadge[stage]}>{stage}</Badge>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {items.length === 0 && (
                            <p className="py-3 text-center text-[10px] text-muted-foreground">Drop here</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </Section>
    </>
  );
}
```

- [ ] **Step 3: Build check**

```bash
pnpm --filter @nxtsft/web build
```

Expected: zero errors.

- [ ] **Step 4: Manual verify**

- Sign in as `admin@nxtsft.com` → `/admin-portal` → CRM Pipeline tab
- 8 leads should appear in the kanban columns
- Drag a "New" lead card to the "Hot" column — card should move instantly (optimistic), toast appears, DB updated
- Refresh page — lead should remain in "Hot" column

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin-portal/tabs/CRMTab.tsx
git commit -m "feat: CRM kanban drag-and-drop with @hello-pangea/dnd"
```

---

## Task 7: Marketing campaign builder

**Files:**
- Modify: `apps/web/src/components/admin-portal/tabs/MarketingTab.tsx`

**Interfaces:**
- Consumes: `trpc.campaigns.list`, `trpc.campaigns.create`, `trpc.campaigns.updateStatus` from Task 4

- [ ] **Step 1: Replace `MarketingTab.tsx`**

Replace the entire file:

```typescript
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./PageHead";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const AUDIENCE_LABELS: Record<string, string> = { all: "All Users", user: "Buyers", sales: "Sales Reps", admin: "Admins" };

const EMPTY_FORM = { name: "", type: "email", audience: "all", subject: "", body: "", budget: "", scheduledAt: "" };

function fmtBudget(n: number | null) {
  if (!n) return "—";
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
}

function fmtCpl(budget: number | null, leads: number) {
  if (!budget || !leads) return "—";
  return `₹${Math.round(budget / leads).toLocaleString("en-IN")}`;
}

export function MarketingTab() {
  const campaignsQ = trpc.campaigns.list.useQuery();
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => { campaignsQ.refetch(); setShowModal(false); setForm(EMPTY_FORM); toast.success("Campaign created"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => campaignsQ.refetch(),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const campaigns = campaignsQ.data ?? [];

  const totalBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const avgCpl = totalLeads > 0 ? Math.round(totalBudget / totalLeads) : 0;

  const toggle = (id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    updateStatus.mutate({ id, status: next }, { onSuccess: () => toast.success(`Campaign ${next}`) });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    createMutation.mutate({
      name: form.name,
      type: form.type as "email" | "sms" | "whatsapp",
      audience: form.audience as "all" | "user" | "sales" | "admin",
      subject: form.subject || undefined,
      body: form.body || undefined,
      budget: form.budget ? parseInt(form.budget) : undefined,
      scheduledAt: form.scheduledAt || undefined,
    });
  };

  return (
    <>
      <PageHead title="Marketing" subtitle="Campaigns, attribution and creative library." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Budget" value={fmtBudget(totalBudget)} sub={`${campaigns.length} campaigns`} />
        <StatCard label="Leads Generated" value={String(totalLeads)} sub="across all campaigns" />
        <StatCard label="Avg CPL" value={avgCpl > 0 ? `₹${avgCpl.toLocaleString("en-IN")}` : "—"} sub="cost per lead" />
      </div>

      <Section
        title="Campaigns"
        action={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-white transition hover:opacity-90">
            <Plus size={13} /> New Campaign
          </button>
        }
      >
        {campaignsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create your first one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Type</th>
                  <th>Audience</th>
                  <th>Budget</th>
                  <th>Leads</th>
                  <th>CPL</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-navy">{c.name}</td>
                    <td className="text-xs">{TYPE_LABELS[c.type] ?? c.type}</td>
                    <td className="text-xs">{AUDIENCE_LABELS[c.audience] ?? c.audience}</td>
                    <td className="font-mono text-xs">{fmtBudget(c.budget)}</td>
                    <td>{c.leads}</td>
                    <td className="font-mono text-xs text-accent">{fmtCpl(c.budget, c.leads)}</td>
                    <td>
                      <Badge tone={c.status === "active" ? "success" : c.status === "paused" ? "cold" : "warm"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {(c.status === "active" || c.status === "paused") && (
                        <button onClick={() => toggle(c.id, c.status)} className="text-xs font-semibold text-accent hover:underline" disabled={updateStatus.isPending}>
                          {c.status === "active" ? "Pause" : "Resume"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Create campaign modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-secondary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Campaign Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bandra Premium — Google" required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Audience</label>
                  <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="user">Buyers</SelectItem>
                      <SelectItem value="sales">Sales Reps</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.type === "email" && (
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Subject</label>
                  <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Email subject line"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Message / Body</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Campaign message content…" rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Budget (₹)</label>
                  <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="e.g. 240000" min={0}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Schedule Date</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-navy hover:bg-secondary transition">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 disabled:opacity-50">
                  {createMutation.isPending ? "Creating…" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Build check**

```bash
pnpm --filter @nxtsft/web build
```

- [ ] **Step 3: Manual verify**

- Sign in as `admin@nxtsft.com` → `/admin-portal` → Marketing tab
- 3 seeded campaigns show in table with real budget/leads data
- Click "New Campaign" → modal opens
- Fill name "Test Campaign", type "SMS", audience "All", body "Hello" → click Create
- Campaign appears in table with status "draft"
- Click "Pause" on an active campaign → status changes to "paused"

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin-portal/tabs/MarketingTab.tsx
git commit -m "feat: marketing campaign builder with live DB and create modal"
```

---

## Task 8: SA Billing tab → live DB

**Files:**
- Modify: `apps/web/src/components/sa-portal/tabs/BillingTab.tsx`

**Interfaces:**
- Consumes: `trpc.superAdmin.billingStats` from Task 4

- [ ] **Step 1: Replace `BillingTab.tsx`**

Replace the entire file:

```typescript
"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { downloadCSV } from "@/lib/download-csv";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";

function fmtRupees(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function BillingTab() {
  const statsQ = trpc.superAdmin.billingStats.useQuery();
  const stats = statsQ.data;

  const payments = stats?.recentPayments ?? [];

  return (
    <>
      <TabHeader
        title="Billing & Revenue"
        subtitle="Subscriptions, invoices and payouts."
        action={
          <button
            onClick={() => toast.success("Statement PDF downloading…")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            Download Statement
          </button>
        }
      />
      {statsQ.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading billing data…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="MRR" value={stats ? fmtRupees(stats.mrr) : "—"} sub="active subscriptions" />
            <StatCard label="ARR Projection" value={stats ? fmtRupees(stats.arr) : "—"} sub="MRR × 12" />
            <StatCard
              label="Outstanding"
              value={stats ? fmtRupees(stats.outstanding) : "—"}
              sub={`${stats?.outstandingCount ?? 0} failed/expired`}
              accent="text-amber-600"
            />
            <StatCard label="Payments" value={String(payments.length)} sub="recent transactions" />
          </div>

          <Section
            title="Recent Payments"
            action={
              <button
                onClick={() =>
                  downloadCSV(
                    "payments.csv",
                    ["ID", "Customer", "Amount", "Status", "Method", "Date"],
                    payments.map((p) => [
                      p.id.slice(-8),
                      p.userName,
                      fmtRupees(p.amount),
                      p.status,
                      p.method,
                      new Date(p.createdAt).toLocaleDateString("en-IN"),
                    ]),
                  )
                }
                className="text-xs font-semibold text-accent hover:underline"
              >
                Export CSV →
              </button>
            }
          >
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th className="py-2">ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-xs">{p.id.slice(-8)}</td>
                        <td className="font-semibold text-navy">{p.userName}</td>
                        <td className="font-mono text-sm">{fmtRupees(p.amount)}</td>
                        <td>
                          <Badge
                            tone={
                              p.status === "Success" ? "success" : p.status === "Failed" ? "hot" : "warm"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="text-xs">{p.method}</td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Build check + manual verify**

```bash
pnpm --filter @nxtsft/web build
```

Sign in as `sa@nxtsft.com` → `/sa-portal` → Billing tab. Should show real MRR/ARR from subscriptions table. (Demo subscriptions = ₹1,099 seeded → MRR ≈ ₹1,099.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sa-portal/tabs/BillingTab.tsx
git commit -m "feat: SA Billing tab pulls live MRR/ARR/payments from DB"
```

---

## Task 9: SA AI Model Control → live DB

**Files:**
- Modify: `apps/web/src/components/sa-portal/tabs/AITab.tsx`

**Interfaces:**
- Consumes: `trpc.superAdmin.modelVersions`, `trpc.superAdmin.deployModel`, `trpc.superAdmin.rollbackModel` from Task 4

- [ ] **Step 1: Replace `AITab.tsx`**

Replace the entire file:

```typescript
"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";

export function AITab() {
  const modelsQ = trpc.superAdmin.modelVersions.useQuery();
  const deploy = trpc.superAdmin.deployModel.useMutation({
    onSuccess: (m) => { modelsQ.refetch(); toast.success(`${m.name} deployed to live`); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const rollback = trpc.superAdmin.rollbackModel.useMutation({
    onSuccess: (m) => { modelsQ.refetch(); toast.success(`${m.name} rolled back`); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const models = modelsQ.data ?? [];
  const liveCount = models.filter((m) => m.status === "live").length;
  const canaryCount = models.filter((m) => m.status === "canary").length;

  return (
    <>
      <TabHeader
        title="AI Model Control"
        subtitle="Production model versions, drift and rollout."
      />
      {modelsQ.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading models…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Models Live" value={String(liveCount)} sub={`${canaryCount} in canary`} />
            <StatCard label="Total Models" value={String(models.length)} sub="in registry" />
            <StatCard label="Avg Accuracy" value={models.length ? `${(models.reduce((s, m) => s + m.accuracy, 0) / models.length).toFixed(1)}%` : "—"} sub="across live models" />
          </div>

          <Section title="Model Registry">
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">Model</th>
                    <th>Purpose</th>
                    <th>Drift</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                    <th>Deployed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs">{m.name}</td>
                      <td className="text-sm font-semibold text-navy">{m.purpose}</td>
                      <td className={`font-mono text-xs ${m.drift > 1.5 ? "text-amber-600" : "text-emerald-600"}`}>
                        {m.drift.toFixed(1)}%
                      </td>
                      <td className="font-mono text-xs">{m.accuracy.toFixed(1)}%</td>
                      <td>
                        <Badge
                          tone={m.status === "live" ? "success" : m.status === "canary" ? "warm" : "default"}
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {m.deployedAt ? new Date(m.deployedAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="text-right space-x-3">
                        {m.status !== "live" && (
                          <button
                            onClick={() => deploy.mutate({ id: m.id })}
                            disabled={deploy.isPending}
                            className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
                          >
                            Deploy
                          </button>
                        )}
                        {m.status === "live" && (
                          <button
                            onClick={() => rollback.mutate({ id: m.id })}
                            disabled={rollback.isPending}
                            className="text-xs font-semibold text-rose-500 hover:underline disabled:opacity-40"
                          >
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Build check + manual verify**

```bash
pnpm --filter @nxtsft/web build
```

Sign in as `sa@nxtsft.com` → `/sa-portal` → AI Model Control tab.
- 4 models from seed appear with real drift/accuracy values
- Click "Rollback" on a live model → status changes to "inactive", toast appears, DB updated
- Click "Deploy" on inactive model → status changes to "live"

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sa-portal/tabs/AITab.tsx
git commit -m "feat: SA AI Model Control reads live model registry + deploy/rollback"
```

---

## Task 10: SA Content CMS → live DB

**Files:**
- Modify: `apps/web/src/components/sa-portal/tabs/CMSTab.tsx`

**Interfaces:**
- Consumes: `trpc.superAdmin.cmsPages`, `trpc.superAdmin.createCmsPage`, `trpc.superAdmin.publishCmsPage` from Task 4

- [ ] **Step 1: Replace `CMSTab.tsx`**

Replace the entire file:

```typescript
"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";

const EMPTY_FORM = { title: "", path: "/", body: "", scheduledAt: "" };

export function CMSTab() {
  const pagesQ = trpc.superAdmin.cmsPages.useQuery();
  const createPage = trpc.superAdmin.createCmsPage.useMutation({
    onSuccess: () => { pagesQ.refetch(); setShowModal(false); setForm(EMPTY_FORM); toast.success("Page draft created"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const publishPage = trpc.superAdmin.publishCmsPage.useMutation({
    onSuccess: () => { pagesQ.refetch(); toast.success("Page published"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const pages = pagesQ.data ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.path.startsWith("/")) { toast.error("Path must start with /"); return; }
    createPage.mutate({
      title: form.title,
      path: form.path,
      body: form.body || undefined,
      scheduledAt: form.scheduledAt || undefined,
    });
  };

  return (
    <>
      <TabHeader
        title="Content CMS"
        subtitle="Marketing pages, blog and hero content."
        action={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            <Plus size={13} /> New Page
          </button>
        }
      />
      {pagesQ.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading pages…</p>
      ) : (
        <Section title="Pages">
          {pages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No pages yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">Title</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Editor</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-navy">{p.title}</td>
                      <td className="font-mono text-xs">{p.path}</td>
                      <td>
                        <Badge
                          tone={p.status === "published" ? "success" : p.status === "draft" ? "warm" : "new"}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-xs">{p.editor.name}</td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(p.updatedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="text-right">
                        {p.status !== "published" && (
                          <button
                            onClick={() => publishPage.mutate({ id: p.id })}
                            disabled={publishPage.isPending}
                            className="text-xs font-semibold text-accent hover:underline disabled:opacity-40"
                          >
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">New Page</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-secondary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Blog: Mumbai 2027 Outlook" required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Path *</label>
                <input value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                  placeholder="/blog/my-article" required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Body</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Page content…" rows={4}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Schedule Date (optional)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-navy hover:bg-secondary transition">Cancel</button>
                <button type="submit" disabled={createPage.isPending} className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 disabled:opacity-50">
                  {createPage.isPending ? "Creating…" : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Build check + manual verify**

```bash
pnpm --filter @nxtsft/web build
```

Sign in as `sa@nxtsft.com` → `/sa-portal` → Content CMS tab.
- 5 seeded pages appear with real editor names
- Click "New Page" → modal opens
- Fill title "Test Article", path "/blog/test" → Save Draft → appears in table as "draft"
- Click "Publish" on a draft page → status becomes "published"

- [ ] **Step 3: Final overall build + commit**

```bash
pnpm --filter @nxtsft/web build
```

Expected: zero errors across the entire web app.

```bash
git add apps/web/src/components/sa-portal/tabs/CMSTab.tsx
git commit -m "feat: SA Content CMS reads live pages + create/publish actions"
```
