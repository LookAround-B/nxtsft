# NxtSft — Change Review Guide

**Batch:** 17 commits ahead of `origin/main` · **Date:** 2026-07-07
**Against:** `docs/NxtSft-PG & Home Interiors.pdf` (the PG + Home Interiors business spec)

This batch closes the three monetization/dashboard gaps from that PDF, plus a
"Similar listings" quick win. Use this as the PR description when pushing.

---

## Deploy / DB safety (verified before push)

| Check | Result |
|---|---|
| `prisma validate` | ✅ valid |
| Full `apps/web` build | ✅ 56 routes, zero errors |
| Schema changes | 2 nullable FK columns (`InteriorDesigner.userId`, `DecorStore.userId`) + indexes + 2 `User` reverse-relations + 1 comment |
| Live prod DB has those columns/indexes/FKs | ✅ verified present |
| 2 new `Plan` data rows (`designer-monthly`, `decor-monthly`, ₹499) | ✅ verified present in prod |
| Prisma client ↔ live DB match | ✅ verified (live query on the new relation succeeds) |
| Does deploy mutate the DB? | ❌ No — Vercel build runs `prisma generate` only, never `db push`/`migrate` |

**Bottom line:** pushing is DB-safe. The two `userId` columns and both `Plan`
rows were already applied to the shared prod DB during development, and the
deploy path never alters schema.

**⚠️ Pre-existing DB drift (NOT from this batch, but flag it):** the live prod
DB has a `Property.areaUnit` column and two tables (`ReviewHelpful`,
`UnsubscribeRequest`) that are **not** in `schema.prisma`, all holding data.
This is harmless to deploy (`prisma generate` doesn't compare against the DB).
**Do NOT run `prisma db push` against the prod DB** — it would try to drop them
with `--accept-data-loss`. The two schema additions in this batch were applied
via targeted SQL specifically to avoid that.

---

## The 4 features

### 1. Similar Properties / Similar PGs — commit `8b254be`
**PDF:** "Similar PGs" (PG detail) / "Similar Interior Designers" (interiors detail).
- Backend: `properties.similar` — `packages/trpc/src/routers/properties.ts`
- Frontend: `apps/web/src/app/properties/[slug]/PropertyDetailClient.tsx` (`SimilarProperties`)
- **Review:** open any property/PG detail page → section at the bottom of the left column, titled "Similar PGs" for PG type, else "Similar Properties".

### 2. Designer/Decor account linking + lead dashboard — spec `039df7f`, impl `bde0ea1`
**PDF:** Home Interiors "Lead Management" — the designer sees their leads in a dashboard.
- Schema: `InteriorDesigner.userId` / `DecorStore.userId` — `packages/db/prisma/schema.prisma`
- Backend: `interiorDesigners.{submit (sets userId), myProfiles, myLeads}`, `decorStores.{same}`, `users.sellerUnlocks`, owner-notify on unlock — `interiorDesigners.ts` / `decorStores.ts` / `properties.ts` / `users.ts`
- Frontend: `apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx` (new "My Business" tab), `SellerLeadsTab.tsx` (new "Contact Unlocks" section)
- Spec: `docs/superpowers/specs/2026-07-07-designer-lead-dashboard-design.md`
- **Review:** sign in as a user who owns a designer/decor listing → "My Business" tab shows their listing(s) + leads. When a buyer unlocks that listing's contact, a lead row + a bell notification appear for the owner. Also closes the same gap for PG/property owners (`sellerUnlocks`).

### 3. Designer/Decor monthly listing billing — spec `f6d94f1`, plan `635ff9f`, impl `066747c` `e6f565b` `6af133e` `c6301ca` `d28934e` `b89f8a5`
**PDF:** Home Interiors "Monthly Listing Plan (₹400–1,000/month)".
- Enum + data: `planTypeSchema` gains `designer`/`decor` (`packages/trpc/src/sanitize.ts`); two ₹499 `Plan` rows (`packages/db/prisma/seed.ts`)
- Backend: `subscriptions.{createBusinessOrder, createBusinessPayUOrder, verifyBusinessPayment, myBusinessSubscription}` — `packages/trpc/src/routers/subscriptions.ts` (mirrors the existing owner-plan procedures, but DB-sourced)
- Frontend: `MyBusinessTab.tsx` "Listing Plan" section (Razorpay/PayU checkout, reuses `CreditsTab` pattern); admin `apps/web/src/components/portal/PlansManager.tsx` now shows Designer/Decor plan groups
- Spec: `docs/superpowers/specs/2026-07-07-designer-decor-billing-design.md` · Plan: `docs/superpowers/plans/2026-07-07-designer-decor-billing.md`
- **Review:** "My Business" tab → "Listing Plan" section shows the ₹499 plan + Subscribe (or the active plan + expiry if subscribed). Admin/SA Plans Manager shows the two new groups (editable price/copy).
- **Note:** track-only, no enforcement on lapse — deliberately matching how the app's existing owner-rent/owner-sell plans already behave.

### 4. PG owner media package requests — spec `e4d1ca5`, plan `aa9ff81`, impl `8a6f4d5` `d9b92f0` `f786245` `ab3e186`
**PDF:** "For PG Owners" Starter (₹2,000–4,500) / Premium (₹5,000–8,000) packages.
- Backend: `properties.requestMediaPackage` (lead capture → `Enquiry` row, source `"PG Media Package"`) — `packages/trpc/src/routers/properties.ts`
- Frontend: `MyListingsTab.tsx` "Get Professional Media" button + modal (PG listings only); admin `EnquiriesTab.tsx` new "Source" column/badge
- Spec: `docs/superpowers/specs/2026-07-07-pg-media-package-requests-design.md` · Plan: `docs/superpowers/plans/2026-07-07-pg-media-package-requests.md`
- **Review:** sign in as a PG owner → My Listings → "Get Professional Media" on a PG card → pick Starter/Premium → the request lands in the admin Enquiries queue, badged "PG Media Package".
- **Note:** lead-capture only by design (v1). The owner requests; staff follow up offline to shoot/schedule/quote/collect payment. No online checkout for the packages — a deliberate scope decision, since the deliverable is a real-world creative-production service.

---

## Known PDF items NOT in this batch (never in these 4 features' scope)

- **"Distance"** on the PG listing card — needs geolocation math; not built. (Everything else on the PG card *is* present: cover, verified badge, gender, name, location, occupancy, available beds, amenity icons, starting rent, view-details.)
- **"Nearby Colleges/Companies"** on the PG detail page — the `Location.nearbyPlaces` field exists in the schema but isn't rendered on the detail page.
- **Designer lead *analytics* / performance charts** — the lead *list* is built (feature 2); analytics dashboards/charts are not.
- **"Property location (if shared)"** in designer leads — approximated with the buyer's city (no per-lead property location is captured today).
- PDF's own **"future/optional"** items — featured-listing subscription, monthly social-media management, Google Business optimization, Meta/Google ads, designer "Rating (Future)" — the PDF marks these as future, so not gaps.

---

## How it was verified

Every feature: `tsc --noEmit` + `next lint` + full `pnpm build`, plus live
browser/API verification against the real dev server and the shared prod DB
using throwaway test rows deleted immediately after. Each of the three
sub-projects ran through implement → per-task review → whole-branch review
(subagent-driven development). Per-task evidence is in `.superpowers/sdd/*-report.md`
(gitignored scratch). Canonical build tracker: `progress.md`. Full code-verified
status vs. the original platform PRD: `docs/PRD.md`.
