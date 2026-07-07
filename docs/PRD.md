# NxtSft — PRD Build Status & Gap Analysis

**Date:** 2026-07-06 · **Baseline commit:** `e7417c8` · **Against:** [`nxtsft_prd.pdf`](nxtsft_prd.pdf) v1.0 (June 2026, Aashish Reddy)

This document maps every section of the original PRD to the current codebase, verified against source (not against `progress.md` or memory notes, which were found to be partially stale — e.g. claiming EMI/photo-upload were unfinished when they're now live, and claiming the admin Commissions tab was done when it's actually 100% static). Where the build has gone beyond the original spec, that's called out separately in §14.

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Live — wired to real DB/tRPC, matches or exceeds spec intent |
| 🟡 | Partial / hybrid — core is live, some sub-panels are static filler or demo-scaled |
| ⚪ | Static-only — UI exists, zero backend, often literal hardcoded strings/toasts |
| ❌ | Not built |

---

## 1. Executive Summary

NxtSft has substantially outgrown its original spec. The spec (§2.1) described a **demo**: localStorage auth, static JSON fixtures, "pluggable to REST/Supabase in production." The actual build replaced that entire foundation — real Postgres (35 Prisma models), tRPC v11, httpOnly signed-cookie sessions, two live payment gateways (Razorpay + PayU), and a hardened security posture (GOL-268) — and then **expanded scope well beyond the spec**: three new directory verticals (Home Interiors, Decor Stores, Builders/Projects), an "agent" and "home-seller" role neither envisioned in §3, a Refer & Earn program, KYC review, and enquiries handling.

At the same time, a meaningful slice of the *originally specced* screens are still UI-only shells with no backing data — several long-standing (Knowledge Base, Global Analytics, Click Alerts, permission enforcement) and one newly discovered in this audit (the **admin portal's Commissions tab is 100% static**, despite a real `Commission` model and a working sales-side equivalent already existing).

| Area | Spec coverage | Notes |
|---|---|---|
| Public website (§4) | ✅ Complete + expanded | Plus Builders/Interiors/Decor/PG directories not in spec |
| User/Buyer Portal (§5) | 🟡 9/10 live, 1 hybrid | Credits tab has static sub-panels (unlocked contacts, wallet ledger, disputes — no backing model) |
| Admin Portal (§6) | 🟡 10/13 live | Click Alerts (static, wrong feature entirely), Commissions (static), Developer/Builder Mgmt (bulk-import only, no per-developer CRUD) |
| Sales Portal (§7) | 🟡 4/8 live | Lead Details, Site Visits, Listings still static fixtures |
| Supervisor Portal (§8) | 🟡 6/8 live | Activity Monitor + Lead Reassignment static |
| Support Portal (§9) | 🟡 5/6 live | Knowledge Base has no DB model at all |
| Super Admin Portal (§10) | 🟡 13/15 live | Global Analytics static; Permission matrix authored but **not enforced** anywhere |
| Data Models (§11) | ✅ Exceeded | 35 models vs. spec's illustrative 7 |
| Pricing Plans (§12) | ✅ Live | DB-backed, admin-editable |
| Auth/Session/Security (§13) | 🟡 Exceeded in places, short in others | Real server-side security >> spec's "demo," but 2FA/OTP genuinely never implemented (toggle was removed for being fake) |

---

## 2. Platform & Architecture — delta from spec

| Spec (§2.1) | Actual |
|---|---|
| "Custom localStorage-based session system (demo)" | httpOnly, HMAC-signed session cookie set server-side (`POST /api/auth/session`), hashed session tokens at rest (`packages/shared/src/session-cookie.ts`) |
| "Static JSON fixtures (demo); pluggable to REST/Supabase" | Postgres via Prisma 7 (engine-free/WASM query compiler), tRPC v11 — not REST/Supabase as speculated |
| Vercel-compatible deployment | Deployed at `www.nxtsft.com`; **only `apps/web` is deployed** — `apps/api` (a parallel Fastify server) exists in the monorepo, is unused, and its `type-check` currently fails (extensionless-import errors under its stricter `moduleResolution`). Dead weight: either finish or remove it |
| Static JSON fixtures still present | `apps/web/src/data/*` fixtures are still imported by ~9 portal tab components (see §14 static-data inventory) — remnants of the original demo, not fully purged |

---

## 3. User Roles — delta from spec

Spec (§3) defined exactly 7 roles. Current `User.role` (schema.prisma:23) supports: `super-admin | admin | supervisor | sales | support-admin | user | home-seller | agent`.

- **Not built**: the spec's "Customer" role (§3 Role 7 — "premium concierge buyer... same as Home Buyer but designated managed/priority customer") was never implemented as a distinct role; there is no concierge differentiation in `user-portal`.
- **Beyond spec**: `home-seller` (property owners get a distinct seller experience — My Listings gating, Seller Leads/Visits tabs, seller approval queue) and `agent` (directory marketing-agent role, shipped 2026-07-04) — neither existed in the original role model.
- **Beyond spec, partially wired**: `User.supervisorId` (a real supervisor→rep hierarchy) now exists in the schema and is settable via `admin.assignSupervisor` (`admin.ts:894-917`), and Reports (§6.11/§8.8) shows a "reports to" column derived from it (`reports.ts:129-368`). **But the Supervisor Portal's own backend (`supervisor.ts`) has zero references to `supervisorId`** — it still treats every sales rep as one flat, unscoped pool. So the hierarchy field exists and is visible in reporting, but doesn't yet gate who a supervisor actually manages.

---

## 4. Public Website & Landing Pages

| § | Feature | Status | Notes |
|---|---|---|---|
| 4.1 | Home Page | ✅ | Hero carousel, KPI count-up, featured carousel, categories, city coverage, testimonials, press, portal nav cards |
| 4.2 | Auth (Login/Register/Admin-login) | ✅ | Real `auth.login`/`register`/`loginStaff`; **"Forgot password" is a `toast.info("coming soon")`** — no reset flow exists (new finding, not in spec's gap list) |
| 4.3 | Properties Listing + Detail | ✅ | Search/filter/sort, carousels, RERA badge, map pin, reviews, contact unlock |
| 4.4 | Agents Directory | ✅ | Live DB (`users.getAgents/getAgent`), full self-serve registration + approval |
| 4.5 | List a Property | ✅ | 4-step form, RERA validation, **gallery upload now live** (`ImageUploader` → `media.uploadImage` → R2, `list/page.tsx:1111`) — spec-open item resolved |
| 4.6 | Pricing Plans | ✅ | DB-backed seeker/owner plans, live checkout |
| 4.7 | User Profile | ✅ | Editable identity, security panel (real change-password/sessions), **2FA toggle removed** (was fake — see §13) |
| 4.8 | Legal & Policy Pages | ✅ | Terms/Privacy/Cookie/Fraud-advisory/About/Contact all present |

---

## 5. User Portal — Home Buyer (10 spec sections, all present + 4 beyond-spec tabs)

| § | Feature | Status | Notes |
|---|---|---|---|
| 5.1 | Overview Dashboard | ✅ | `OverviewDashboard.tsx` |
| 5.2 | Saved Properties | ✅ | `SavedTab.tsx` |
| 5.3 | Recently Viewed | ✅ | `RecentlyViewedTab.tsx` — real view history + dwell time via `PropertyView` |
| 5.4 | My Credits & Tokens | 🟡 | Core (balance, plan, top-up, both gateways) is live. **Static sub-panels**: Unlocked Contacts, Wallet Ledger, Disputes (`@/data/static`) — no `Dispute` model exists in schema; "File dispute" is a toast only |
| 5.5 | Search Alerts | ✅ | Full CRUD (`SearchAlertsTab.tsx`) — but no auto-matching job exists (alerts don't notify on real matches yet) |
| 5.6 | My Listings | ✅ | `MyListingsTab.tsx` — "Boost" is a toast only (paid feature, not built) |
| 5.7 | Site Visits | ✅ | `SiteVisitsTab.tsx` — reschedule/cancel live |
| 5.8 | EMI Calculator | ✅ | `EMICalcTab.tsx` — real amortization math, live-recalculated. (Both `progress.md` and the June status recap incorrectly call this "static" — it isn't; it's just unpersisted, which is fine for a calculator) |
| 5.9 | Documents & KYC | ✅ | `KYCTab.tsx` — real upload via `users.kyc.submit` → R2, admin review loop |
| 5.10 | Profile & Preferences | ✅ | `ProfileTab.tsx` |
| — | *Refer & Earn* (beyond spec) | ✅ | `ReferTab.tsx` — full referral submission program (`ReferralSubmission` model) |
| — | *Seller Leads/Visits* (beyond spec) | ✅ | Home-seller-only CRM view of leads/visits on their own listings |
| — | *Support Tickets* (beyond spec) | ✅ | Added 2026-07-04 (GOL-272) |

---

## 6. Admin Portal — Operations Management (13 spec tabs + 12 tabs beyond spec)

| § | Feature | Status | Notes |
|---|---|---|---|
| 6.1 | Operations Dashboard | 🟡 | Live core KPIs + hybrid: `activities`/`teamMembers` filler still imported from `@/data/static.ts` |
| 6.2 | Team Management | ✅ | Add staff logins; now also supports `admin.assignSupervisor` (beyond spec) |
| 6.3 | Listings Management | ✅ | Approve/reject/feature/edit/delete |
| 6.4 | Lead Management | ✅ | `LeadsTab.tsx` |
| 6.5 | CRM Pipeline | ✅ | Kanban with real drag-and-drop (`@hello-pangea/dnd`), optimistic UI |
| 6.6 | Subscriptions | ✅ | Plan-purchase table, cancel; "unlock records/disputes" sub-sections left static (no backend, flagged since 06-10) |
| 6.7 | Property Views Analytics | ✅ | `ViewsTab.tsx` — total/unique/unlock-rate + buyer activity feed |
| 6.8 | Click Alerts | ⚪ | **Wrong feature entirely, and static.** Spec wants price-threshold/view-count alerting; `AlertsTab.tsx` is actually a parallel, DB-less "user click capture" system running entirely on `localStorage["nxtsft.leads"]` via `lib/leads.ts`, with a hardcoded `TEAM_MEMBERS` array. Effectively not built against spec intent |
| 6.9 | Marketing Tools | ✅ | `MarketingTab.tsx` — live `campaigns` router, StatCards, pause/resume |
| 6.10 | Developer/Builder Management | 🟡 | Weakest vertical — `DevTab.tsx` is bulk-import tooling only (`builders.bulkImport/xmlImport/backfillSlugs/stats`); no individual builder profile editor, no per-developer commission-rate config, no project-allocation UI as spec envisioned |
| 6.11 | Reports | ✅ | Live via `reports.snapshot` |
| 6.12 | Plans Manager | ✅ | `PlansManager.tsx` (shared component) |
| 6.13 | Commissions | ⚪ | **New finding — not previously flagged anywhere.** `CommissionsTab.tsx` has **zero tRPC calls**: StatCards are literal hardcoded strings (`"₹6.42 L"` etc.), bank-account masks and payment methods are hardcoded lookup tables, "Release" fires a toast only. A real `Commission` model already exists and backs the sales-side `leads.myCommissions` — wiring an admin-side aggregate query would be a small addition, not new plumbing |
| — | *12 tabs beyond spec* | ✅ (mostly) | Agents, Bulk Listings, Decor, Enquiries, Home Banners, Interiors, KYC Review, Referrals, Reviews, Seller Approvals, Site Content, Dev(builder bulk-import) — reflects the directory-vertical expansion (§14) |

---

## 7. Sales Portal — Field Sales Rep (8 spec tabs)

| § | Feature | Status | Notes |
|---|---|---|---|
| 7.1 | My Leads | ✅ | `MyLeadsTab.tsx` |
| 7.2 | Lead Details | ⚪ | `DetailTab.tsx` — imports `leads, activities, propertyViews, properties` from `@/data/static`; "Log Action" is a toast only |
| 7.3 | Activity Log | ✅ | `LogTab.tsx` — fully live (`leads.myActivities`/`leads.logActivity`, backed by `SalesActivity`) |
| 7.4 | Click-to-Call | ✅ | `CallTab.tsx` |
| 7.5 | Site Visits | ⚪ | `VisitsTab.tsx` — fully hardcoded `initialSlots`, despite a real `siteVisits` router already used elsewhere (supervisor Visit Calendar) |
| 7.6 | My Commission | 🟡 | `CommissionTab.tsx` — pending/MTD/YTD/payouts genuinely live (`leads.myCommissions`); "Target vs Achievement" breakdown is demo-scaled from a hardcoded `BASE_PLANS` array via a `monthSeed()` function explicitly commented "demo variation" |
| 7.7 | Listings | ⚪ | `ListingsTab.tsx` — static `properties`; approval status keyed off a hardcoded `APPROVAL_MAP` for fixture IDs `p1`…`p6`, source comment literally says *"demo; wire to DB when ready"* |
| 7.8 | Reports | ✅ | Live, rep-scoped via `Lead.assignedToId`/`SiteVisit.salesRepId` |

---

## 8. Supervisor Portal — Team Desk (8 spec tabs)

| § | Feature | Status | Notes |
|---|---|---|---|
| 8.1 | Team Dashboard | 🟡 | KPIs live (`leads.stats`); "Team Members — Live Status" panel is static (no per-rep online/call-count backend) |
| 8.2 | Team Leads | ✅ | All-reps lead list (flat, per §3) |
| 8.3 | Lead Reassignment | ⚪ | `ReassignmentTab.tsx` — static `leads`/`teamMembers`, hardcoded `repLoadMap`, "Reassign now" is a toast only |
| 8.4 | Activity Monitor | ⚪ | `ActivityMonitorTab.tsx` — hardcoded `callLog` array, "Avg Response Time 2.4h" is a literal string; even its "real-looking" Property View Feed section reads from `@/data/static`, not a live query |
| 8.5 | Performance Analytics | ✅ | `supervisor.performance` |
| 8.6 | Visit Calendar | ✅ | Live `siteVisits.mapData` + Mapbox geographic map |
| 8.7 | Escalations | ✅ | Live (`Escalation` model, `supervisor.escalations.*`) |
| 8.8 | Reports | ✅ | Live, all-reps scope (flat model) |

---

## 9. Support Portal — Support Administration (6 spec tabs)

| § | Feature | Status | Notes |
|---|---|---|---|
| 9.1 | Dashboard | ✅ | `tickets.stats` |
| 9.2 | Ticket Queue | ✅ | Filters, resolve/escalate, CSV export |
| 9.3 | Escalations | ✅ | Priority-modelled (no separate "Escalated" status column in DB — approximated via priority) |
| 9.4 | My Assignments | ✅ | Scoped to `assignedTo === session.id` |
| 9.5 | TAT Report | ✅ | Live via shared `deriveTicketRow` helper |
| 9.6 | Knowledge Base | ⚪ | `KnowledgeBaseTab.tsx` — hardcoded `KB_ARTICLES` (7 items), "+ New Article"/"View →" are toasts. **No DB model exists for this at all** — a genuine schema gap, not just a wiring gap |

---

## 10. Super Admin Portal — Command Centre (15 spec tabs)

| § | Feature | Status | Notes |
|---|---|---|---|
| 10.1 | Command Dashboard | ✅ | KPIs + live System Health panel |
| 10.2 | User Management | ✅ | Search/role filters, CSV, `updateRole`, `verify` |
| 10.3 | All Teams | ✅ | `TeamsTab.tsx` |
| 10.4 | Platform Configuration | ✅ | `ConfigTab.tsx` — live `getPlatformConfig`/`updatePlatformConfig` (persisted via `AuditLog`), **plus a real payment-gateway switcher** (`getActiveGateway`/`setActiveGateway` → `SiteSetting`) that actually drives checkout routing. (Both `progress.md` and memory called this "fully static" — that's now wrong; it was live at time of audit) |
| 10.5 | Global Analytics | ⚪ | `AnalyticsTab.tsx` — entirely hardcoded arrays (`cities`, `channels`, `userGrowth`, `funnel`); "Realtime" badge is cosmetic |
| 10.6 | Audit Trail | ✅ | `admin.auditLog`, real `AuditLog` model |
| 10.7 | AI Model Control | 🟡 | `AITab.tsx` — model registry + deploy/rollback via `superAdmin.modelVersions` (`ModelVersion` model). Lighter than spec's vision (no live drift-over-time monitoring or per-signal feature-engineering controls) but functionally present |
| 10.8 | Notifications Centre | ✅ | Broadcast composer (title/message/audience-role) |
| 10.9 | Content CMS | 🟡 | `CmsPage` model + `CMSTab.tsx` (create/publish pages) + `SiteContentTab`/`HomeBannersManager` cover most of it; no blog/article system with author/publish-date/SEO-slug as spec describes |
| 10.10 | Security Console | ✅ | Failed-login feed, security log, IP whitelist/blacklist editor, password+2FA policy editor |
| 10.11 | Billing & Revenue | 🟡 | `BillingTab.tsx` — MRR/ARR/outstanding/payments live; no invoice generation or GST tax-report export found |
| 10.12 | Role & Permission Management | ⚪ enforcement | Authoring UI is real and good (`PermissionsTab.tsx` — 4-level matrix, "simulate as role X"), persisted via `superAdmin.getPermissionMatrix`/`updatePermissionMatrix`. **But it is never read anywhere else** — grepped the whole `apps/web`/`packages` tree; the only references are the authoring UI and the router itself. Actual route gating (`middleware.ts`) reads a hardcoded static table in `apps/web/src/lib/routes.ts` (`PORTAL_ACCESS`/`canAccess`) that has zero knowledge of the saved matrix. tRPC procedure guards (`adminProcedure`/`staffProcedure`/`superAdminProcedure`) also don't consult it. This is a save-only settings screen today |
| 10.13 | Plans Manager | ✅ | Shared `PlansManager.tsx` |
| 10.14 | Support Tickets | ✅ | `SupportTicketsTab.tsx` |
| 10.15 | Reports | ✅ | Global scope |

---

## 11. Data Models — exceeded spec

Spec §11 illustrated 7 example models (Property, Lead, Team Member, Activity, Subscription, Session, Plan) as a demo sketch. The real schema (`packages/db/prisma/schema.prisma`) has **35 models**, including entire domains the spec never described:

- **Directory verticals**: `Builder`, `Project`, `InteriorDesigner`, `DesignerFavorite`, `InteriorDesignerView`, `DecorStore`, `DecorFavorite`, `DecorStoreView`
- **Ops/CRM depth**: `Commission`, `SalesActivity`, `Escalation`, `PropertyEditRequest`
- **Trust & compliance**: `KycDocument`, `AuditLog`
- **Growth**: `ReferralSubmission`, `Enquiry`, `Campaign`
- **Platform**: `ModelVersion`, `CmsPage`, `SiteSetting`
- **Engagement**: `PropertyView`, `Favorite`, `Review`, `SearchAlert`, `Notification`, `Message`

---

## 12. Subscription & Pricing Plans

✅ Live end-to-end. Seeker plans (Instant/Basic/Premium) and Owner plans (rent/sell tiers) are DB-backed (`Plan` model), editable via Plans Manager, purchasable through both Razorpay and PayU (see §13.7). Matches spec numbers (₹99/1cr, ₹299/5cr, ₹699/15cr seeker tiers; ₹499–₹4,999 owner tiers).

---

## 13. Authentication, Session & Security

| Spec item | Status |
|---|---|
| 13.1 Auth architecture | ✅ Exceeded — real server-side sessions, not the spec's localStorage demo |
| 13.2 Auth functions | ✅ `auth.{register,login,loginStaff,logout,me}` |
| 13.3 Role-based routing | ✅ `middleware.ts` + `lib/routes.ts` |
| 13.4 2FA via OTP (user) | ❌ **Explicitly removed.** The 2FA toggle had no backing secret/QR/verification — it claimed "OTP required at login" while enforcing nothing. Removed 2026-07-04/05 (GOL-268 H1); the `User.twoFactorEnabled` schema field is kept but unused, pending a real implementation |
| 13.4 Active sessions list | ✅ Live, with per-session terminate; sessions capped at 5/user, tokens hashed at rest |
| 13.5 SA security console | ✅ Failed-login tracking, IP allow/blacklist, force-terminate, password policy config |
| 13.5 2FA enforcement policy per role | 🟡 A policy config screen exists (`getPolicyConfig`/`updatePolicyConfig`); since there's no real 2FA to enforce (see above), this is a config surface without a mechanism behind it yet |
| 13.6 RERA compliance | ✅ Server-side format validation (`lib/rera.ts`, city→state→regex), enforced in `properties.create` |
| — Sign-up OTP verification | ❌ Not built — no email/SMS OTP at registration (needs an SMS/email provider account) |
| — Forgot password | ❌ Not built — `login/page.tsx:185` fires a "coming soon" toast; no reset flow (new finding) |
| **Beyond spec**: CSP nonce, session-token hashing, trusted-proxy-aware rate limiting | ✅ GOL-268 (2026-07-04/05) — see `middleware.ts`, `packages/shared/src/{session-cookie,client-ip}.ts` |

**§13.7 Payments (not in original TOC, but load-bearing):** Both **Razorpay** and **PayU** are fully implemented — real order creation, HMAC/SHA-512 signature verification with constant-time compare, a server-side PayU callback route with amount-tamper checks and idempotency (`apps/web/src/app/api/payu/callback/route.ts`), and a live admin-configurable gateway switch (§10.4) that the checkout flow actually branches on. Whether the deployed environment holds *live* vs. *test* credentials is an operational check only the credential-holder can make — not verified here.

---

## 14. Beyond-Spec Expansions (not in original PRD at all)

These represent real product growth since the June PRD was written and should probably get their own spec pass rather than being retrofitted into this document:

- **Home Interiors directory** — public list/detail, self-serve submission, admin management (mirrors Builders structurally, but with a working self-serve path Builders never got)
- **Decor Stores directory** — same pattern, shipped 2026-07-04 alongside a "Decors" business vertical (GOL-271/274)
- **Agent role & directory** — marketing-agent role, `Property.agentId`, public agent profiles (2026-07-04)
- **Home-seller role** — dedicated seller portal experience, seller approval queue
- **Refer & Earn program** — `ReferralSubmission` model, full submit/review/reward flow
- **Enquiries** — general contact-form intake separate from property `Lead`s
- **KYC document review pipeline** — buyer/seller upload + admin review + status gating

---

## 15. Consolidated Remaining Work (prioritized)

**P0 — data integrity / trust**
- Admin portal **Commissions tab** (§6.13) — wire to the existing `Commission` model; it currently shows fabricated numbers to whoever manages payouts
- **Permission matrix enforcement** (§10.12) — the authoring UI implies control that doesn't exist; either wire `lib/routes.ts`/procedure guards to read it, or relabel the screen as "preview only" until it does

**P1 — user-facing gaps**
- Forgot-password flow (login page currently dead-ends)
- Knowledge Base (§9.6) — needs a real DB model, not just frontend wiring
- Sign-up OTP verification (needs SMS/email provider account)
- Search-alert auto-matching job (alerts save but never notify)

**P2 — portal completeness**
- Sales portal: Lead Details (§7.2), Site Visits (§7.5), Listings (§7.7) — all static fixtures despite live routers (`siteVisits`, `properties`) already existing elsewhere
- Supervisor portal: Lead Reassignment (§8.3), Activity Monitor (§8.4) — static
- Click Alerts (§6.8) — decide whether to build the spec's actual price/view-threshold alerting, or retire the current mismatched localStorage feature
- Developer/Builder Management (§6.10) — individual builder CRUD + self-serve claim path (parity with Interiors/Decor)
- Global Analytics (§10.5) — placeholder
- Listing "Boost" (§5.6) — paid upgrade, currently a toast

**P3 — polish / nice-to-have**
- Real 2FA (secret + QR + verification) if the product actually wants it, otherwise remove the policy-config screen too
- Invoice generation + GST tax reports (§10.11)
- Blog/article CMS (§10.9)
- Admin Subscriptions "unlock records/disputes" sub-panels, Credits tab Unlocked-Contacts/Wallet-Ledger/Disputes — need a real `Dispute`/ledger model if this is a real requirement

**Infra / technical debt**
- `apps/api` (Fastify) — broken type-check, undeployed; decide to fix or delete
- VPS-as-prod-DB follow-ups (carried from `progress.md`): open port 5433 firewalled to Vercel only, add `sslmode=require`, add PgBouncer before real traffic
- Verify whether deployed Razorpay/PayU/R2 credentials are live or test keys
- Remaining `@/data/static.ts`-style fixture imports scattered across ~9 tab components — audit and remove once each is wired

---

## 16. Sources

- Original spec: [`docs/nxtsft_prd.pdf`](nxtsft_prd.pdf) (v1.0, June 2026)
- Prior status docs (superseded by this document where they conflict): `docs/NxtSft_Status_Recap.docx` (2026-06-27), `docs/NxtSft_PRD_Gap_Analysis*.docx`
- Engineering changelog: [`progress.md`](../progress.md) (repo root)
- This audit: full-codebase verification against `schema.prisma`, all 24 tRPC routers, and every portal tab component, 2026-07-06
