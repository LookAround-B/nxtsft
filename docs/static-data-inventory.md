# Static / Hardcoded Data Inventory

Audit date: 2026-07-05 (commit d0c9b02, main). Tracks every static or hardcoded
data source in the app, what consumes it, and what should happen to it.

Legend — **Action**:
- `CMS` — move to admin CMS (`SiteSetting` KV pattern, see `home.hero`)
- `DB` — should come from database (real records)
- `ENV` — env-var placeholder, needs real value set
- `DEDUP` — duplicated source of truth, consolidate
- `DEAD` — unused, delete
- `KEEP` — legitimate code constant, no change

## 0. Verified: what actually renders fake vs DB data (checked 2026-07-05)

**Public site**

| Surface | Status |
|---|---|
| /properties + /properties/[slug] | **DB** (`properties.list` / `properties.get`, leads/visits/favorites mutations) |
| /agents | **DB** (fetches via tRPC in-page; only `ownerSlug` helper from static) |
| /owners/[slug] | **100% FAKE** — filters static `properties` fixture |
| Home hero | **DB (CMS)** with static fallback |
| Home stats/reviews/press | **FAKE** (hardcoded, incl. fake testimonials) |
| /pricing | **FAKE prices client-side**; checkout charges DB — drift risk (§3) |

**Portals — hybrid (DB stats + fake panels)**

| Tab | DB | Still fake |
|---|---|---|
| user OverviewDashboard | favorites, site visits | recent views, featured properties |
| user CreditsTab | credits, plans, current plan, checkout | unlocks, wallet ledger, disputes |
| user ProfileTab | profile update | viewed-properties list/CSV |
| admin LeadsTab | leads list, assign/unassign | **falls back to fake leads when DB empty** (misleading) |
| admin SubscriptionsTab | subscriptions list/cancel | unlocks, disputes |
| supervisor DashboardTab | lead stats | team member list |
| sa Dashboard | admin/superAdmin stats, health | views, activities, top properties panels |
| ReportsDashboard | full snapshot | only filter option labels static (fine) |

**Portals — fully fake (zero tRPC)**: sales DetailTab, sales ListingsTab, sales CommissionTab, supervisor ReassignmentTab, supervisor ActivityMonitorTab, admin CommissionsTab, admin AlertsTab.

**Dead**: `lib/useDbData.ts` (useAgents/useTeamMembers/usePropertyReviews/usePropertyListings) — zero consumers; agents page fetches tRPC directly.

## 1. Dummy/demo data still wired into live UI (highest priority)

| Source | Consumers | Action |
|---|---|---|
| `apps/web/src/data/static.ts` (1303 lines): `properties`, `leads`, `activities`, `teamMembers`, `propertyViews`, `unlockedContacts`, `disputes`, `subscriptions`, `walletLedger`, `portals`, `ownerSlug` | 14 components across sales/supervisor/admin/user/sa portals + `app/owners/[slug]`, `app/agents`, `PortalsSection` | DB — each portal tab should read tRPC, not fixtures |
| `apps/web/src/data/reports.ts` (1378 lines): fake report rows + `REPORT_SUPERVISORS`, `REPORT_SALES`, `REPORT_BUILDERS`, `REPORT_CITIES` | `portal/ReportsDashboard` | DB |
| `apps/web/src/data/agents.ts` (295 lines): `AGENTS` fake agent directory | agents page area | DB (real agent users exist) |
| `apps/web/src/data/dummyNames.ts` (825 lines) + `lib/propertyActivity.ts` | Property activity card | KEEP for now — intentional dummy per GOL-123 decision |
| `admin-portal/tabs/AlertsTab.tsx:10` `TEAM_MEMBERS` (fake names) | AlertsTab | DB |
| `supervisor-portal/tabs/ReassignmentTab.tsx:16` `REASSIGN_REASONS` | ReassignmentTab | KEEP (enum-like) — but assignees come from `static.ts` leads/teamMembers → DB |
| `sales-portal/tabs/CommissionTab.tsx:49` `BASE_PLANS` + `CAT_FACTOR` (commission math) | CommissionTab | DB/CMS — business numbers, admin should control |

## 2. Marketing/site content hardcoded → CMS candidates (SiteSetting pattern)

| Source | Content | Action |
|---|---|---|
| `components/home/homeData.ts` | `HERO_IMAGES` (fallback only — CMS key `home.hero` DONE), `ROTATING_STATS`, `KPI_BAND`, `TOP_STATS_DATA`, `REVIEWS` (fake testimonials), `PRESS`, `SERVICES`, `CITIES`, `WHY`, `CATEGORIES` | CMS — reuse `SiteSetting` keys (`home.stats`, `home.reviews`, `home.press`, …); fall back to static like HeroSection does |
| `components/site/SiteFooter.tsx` | `FOOTER_LINKS`, `CONTACTS` (hello@/care@/careers@/partners@nxtsft.com), `SOCIALS` (all `href: "#"` placeholders) | CMS for contacts/socials; links KEEP. Social `#` links are live placeholders — fix or hide |
| `components/pricing/pricingData.ts` | `RESELLER_PLANS`, `CHOOSER_FLOWS`, 4 FAQ sets | FAQ → CMS candidate; plans → see §3 |
| `components/site/SiteHeader.tsx:25-47` | `PROPERTY_TYPES`, `PROPERTY_CITIES`, `NAV_ITEMS` | KEEP (nav), but PROPERTY_CITIES duplicates `packages/shared` `CITIES` → DEDUP |

## 3. Pricing — multiple sources of truth (DEDUP, real risk)

Plan prices live in **4 places**:
1. `packages/trpc/src/routers/subscriptions.ts:20,27` — `SEEKER_PLANS`, `OWNER_PLANS` (comment says "seeded in DB via migrations/seed" but repo has NO migrations; DB Plan table is queried at runtime)
2. `apps/web/src/data/static.ts:656,730` — `ownerRentalPlans`, `ownerSellPlans` (rendered on /pricing)
3. `components/pricing/pricingData.ts` — `RESELLER_PLANS`
4. DB `Plan` table (whatever is actually in it — repo policy is `prisma db push`, no seed ran per task-2 drop)

Client shows static prices; checkout charges server/DB prices. Drift = user sees one price, pays another. **Consolidate: DB is truth, pricing page fetches `subscriptions.plans`.**

## 4. Business numbers hardcoded server-side

| Source | Value | Action |
|---|---|---|
| `packages/trpc/src/routers/referrals.ts:21` | `REFERRAL_REWARDS` (₹ per referral type) | CMS/DB — admin-editable |
| `packages/trpc/src/routers/supervisor.ts:10` | `MONTHLY_TARGET = 8` | CMS/DB |
| `packages/trpc/src/routers/tickets.ts:17` | `TAT_HOURS` per ticket type | CMS/DB candidate |
| `packages/trpc/src/routers/media.ts:14` | `MAX_BYTES = 5MB` | KEEP |

## 5. Env-backed placeholders (need real values)

| Source | Placeholder | Action |
|---|---|---|
| `components/site/WhatsAppChatButton.tsx` | `9100000000` / `9100000001` fallback | ENV — set `NEXT_PUBLIC_WHATSAPP_SALES_NUMBER` / `_SUPPORT_NUMBER` |
| `lib/site.ts` | `https://www.nxtsft.com` fallback | KEEP (documented) |
| `components/home/homeData.ts` | R2 public bucket URL hardcoded | ENV candidate |

## 6. Dead exports in `data/static.ts` (0 consumers)

`kpis`, `pipeline`, `navLinks`, `plans`, `seekerPlans` — DEAD, delete when static.ts is dismantled.

## 7. Legit constants — no action

Routes/roles (`lib/routes.ts`, `packages/shared/constants.ts`, trpc `server.ts`), MIME allowlists (`lib/file-validation.ts`), validation `LIMITS`, `RATE_LIMITS`, map centroids/palette (`lib/map.ts`), RERA state patterns (`lib/rera.ts`), UI label/tone maps in portal tabs, `AMENITIES` icon map, calendar `MONTHS`/`DAYS`.

## Suggested order of attack

1. §3 pricing dedup (money correctness)
2. §1 portal fixtures → tRPC (biggest fake-data surface)
3. §2 home/footer content → SiteSetting CMS (pattern exists)
4. §5 env placeholders (one-line fixes, need real numbers from user)
5. §6 dead code cleanup
