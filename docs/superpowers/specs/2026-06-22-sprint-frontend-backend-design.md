# NxtSft Sprint — Frontend & Backend Design
**Date:** 2026-06-22 | **Branch:** main | **Phase:** v1.0 demo

---

## Scope

Five independent feature areas, all pure frontend/backend work (no third-party vendor SDKs).

1. Agent `/agents/[slug]` → live DB
2. RERA format validation (state-specific)
3. CRM kanban drag-and-drop
4. Marketing campaign builder
5. SA static tabs → live DB (Billing, AI Model Control, Content CMS)

---

## 1. Agent Pages → Live DB

### Schema
Add to `User` model in `schema.prisma`:
```prisma
slug  String?  @unique
```
Run `prisma db push` to the VPS. Update seed to set slugs for all 15 agent users (kebab-case of name, e.g. `"Priya Sharma" → "priya-sharma"`).

### tRPC (`packages/trpc/src/routers/users.ts`)
- `getAgents` — change from `adminProcedure` to `publicProcedure`; include `slug` in select
- `getAgent(slug: string)` — new `publicProcedure`; fetch single User by slug where role = "agent"; return all metadata fields

### Metadata fields (stored in `User.metadata` JSON)
Seed must include: `initials, rating, reviews, deals, since, specialties, languages, cities, portfolioValue, responseTime, featured, listings`

### Frontend
- `src/app/agents/page.tsx` — already partially wired; fix `publicProcedure` and add `slug` to card links
- `src/app/agents/[slug]/page.tsx` — remove fixture `AGENTS` import; call `trpc.users.getAgent(slug)`; render profile from DB data

---

## 2. RERA Format Validation

### Shared utility: `src/lib/rera.ts`
Exports `validateRera(rera: string, state: string): string | null` — returns error message or null.

State → regex map:
| State | Pattern |
|---|---|
| Maharashtra | `^P\d{11}$` |
| Karnataka | `^PRM\/KA\/RERA\/` |
| Telangana | `^P024\d{8}$` |
| Andhra Pradesh | `^AP\/` |
| Delhi | `^DLRERA\d{4}[A-Z]\d{4}$` |
| Uttar Pradesh | `^UPRERAPRJ\d{7}$` |
| Haryana | `^GGM\/` |
| Tamil Nadu | `^TN\/29\/` |
| West Bengal | `^WBRERA\/` |
| Rajasthan | `^RAJ\/` |
| Kerala | `^K-RERA\/` |
| Gujarat | `^PR\/GJ\/` |
| fallback | `^[A-Za-z0-9\/\-]+$` |

### Usage
- `src/app/list/page.tsx` step 3 validation — import and call `validateRera(data.rera, data.state)`
- `packages/trpc/src/routers/properties.ts` `create` procedure — server-side guard using same utility

---

## 3. CRM Kanban Drag & Drop

### Package
`@hello-pangea/dnd` — install in `apps/web`.

### Changes (only `CRMTab.tsx`)
- Wrap grid in `<DragDropContext onDragEnd={handleDragEnd}>`
- Wrap each stage column div in `<Droppable droppableId={stage}>`
- Wrap each lead card in `<Draggable draggableId={lead.id} index={idx}>`
- `handleDragEnd`: if destination is different from source column, call existing `move(leadId, newStage)`
- Replace per-card `Select` dropdown with a read-only `Badge` showing current stage
- Optimistic UI: update local state immediately, revert on tRPC error

No backend changes.

---

## 4. Marketing Campaign Builder

### Schema (new model)
```prisma
model Campaign {
  id          String   @id @default(cuid())
  name        String
  type        String   // email | sms | whatsapp
  audience    String   @default("all") // all | user | sales | admin
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
```

Add `campaigns Campaign[]` relation to `User` model.

### tRPC (new router `packages/trpc/src/routers/campaigns.ts`)
- `list` — adminProcedure; returns all campaigns ordered by createdAt desc
- `create` — adminProcedure; input: name, type, audience, subject, body, budget, scheduledAt
- `updateStatus` — adminProcedure; input: id, status

### Frontend (`src/components/admin-portal/tabs/MarketingTab.tsx`)
- KPI cards: aggregate from DB (total budget, total leads, avg CPL = budget/leads)
- Campaign table: live DB rows with status badge, pause/resume toggle
- "Create Campaign" button → modal with: name, type (select), audience (select), subject, body (textarea), budget, schedule date
- Send action = toast only (no vendor SDK)
- Seed 3 demo campaigns

---

## 5. SA Static Tabs → Live DB

### 5a. Billing & Revenue

No new schema. New `superAdmin.billingStats` procedure:
- MRR: sum `amount` of `Subscription` where `status = "Active"`, divide by paise→rupee
- ARR projection: MRR × 12
- Outstanding: count + sum of `Subscription` where `status` in `["Failed","Expired"]` and `renewalDate < now()`
- Recent invoices: last 20 `Payment` rows joined with `User.name`, ordered by `createdAt` desc

`BillingTab.tsx`: replace static arrays with `trpc.superAdmin.billingStats` query.

### 5b. AI Model Control

**New model:**
```prisma
model ModelVersion {
  id          String   @id @default(cuid())
  name        String   @unique
  purpose     String
  drift       Float    @default(0)
  accuracy    Float    @default(0)
  status      String   @default("inactive") // live | canary | inactive
  deployedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

New procedures on `superAdmin` router:
- `modelVersions` — query; list all
- `deployModel(id)` — mutation; sets status = "live", deployedAt = now
- `rollbackModel(id)` — mutation; sets status = "inactive"

Seed: 4 demo model versions (match-v3, price-v2, lead-score, recommend).

`AITab.tsx`: replace static array with live query; Deploy/Rollback buttons call mutations.

### 5c. Content CMS

**New model:**
```prisma
model CmsPage {
  id          String   @id @default(cuid())
  title       String
  path        String   @unique
  status      String   @default("draft") // draft | published | scheduled
  body        String?  @db.Text
  scheduledAt DateTime?
  editorId    String
  editor      User     @relation(fields: [editorId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
}
```

Add `cmsPages CmsPage[]` relation to `User` model.

New procedures on `superAdmin` router:
- `cmsPages` — query; list all with editor name
- `createCmsPage` — mutation; input: title, path, body, scheduledAt
- `updateCmsPage` — mutation; input: id + any fields
- `publishCmsPage` — mutation; sets status = "published"

Seed: 5 demo pages (Home Hero, About, Contact, Blog post, Builder co-marketing).

`CMSTab.tsx`: live query; "+ New Page" modal; Publish/Edit actions.

---

## DB Push Checklist

All schema additions are additive (new columns/tables, no drops):
1. `User.slug` — nullable, unique
2. `Campaign` model + `User.campaigns` relation
3. `ModelVersion` model
4. `CmsPage` model + `User.cmsPages` relation

Run once: `pnpm --filter @nxtsft/db prisma db push`

---

## Files Touched Summary

| File | Change |
|---|---|
| `packages/db/prisma/schema.prisma` | Add slug, Campaign, ModelVersion, CmsPage |
| `packages/db/prisma/seed.ts` | Agent slugs + metadata, 3 campaigns, 4 models, 5 CMS pages |
| `src/lib/rera.ts` | New — state-specific RERA validator |
| `packages/trpc/src/routers/users.ts` | getAgents public + getAgent(slug) |
| `packages/trpc/src/routers/campaigns.ts` | New router |
| `packages/trpc/src/routers/superAdmin.ts` | billingStats, modelVersions, deploy/rollback, cmsPages CRUD |
| `packages/trpc/src/index.ts` | Mount campaigns router |
| `src/app/agents/page.tsx` | Use publicProcedure getAgents |
| `src/app/agents/[slug]/page.tsx` | Replace fixture with getAgent(slug) |
| `src/app/list/page.tsx` | State-specific RERA validation |
| `src/components/admin-portal/tabs/CRMTab.tsx` | DnD wrapping |
| `src/components/admin-portal/tabs/MarketingTab.tsx` | Live DB + create modal |
| `src/components/sa-portal/tabs/BillingTab.tsx` | Live billingStats |
| `src/components/sa-portal/tabs/AITab.tsx` | Live modelVersions + actions |
| `src/components/sa-portal/tabs/CMSTab.tsx` | Live cmsPages + create modal |
