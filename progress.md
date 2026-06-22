# NxtSft — Build Progress

> Last updated: 2026-06-22 (session 2)
> Stack: Next.js 15 · tRPC v11 · Prisma 7 · PostgreSQL 16 · Tailwind CSS 4

---

## Overall Status

**Phase:** v1.0 Demo / Prototype  
**DB:** ✅ LIVE — **production DB = teammate's VPS PostgreSQL** at `187.77.185.220:5433/nxtsft` *(team decision 06-13; moved off Neon)*. Accessed via **Prisma** (the ORM — unchanged; we did NOT switch to "Prisma Postgres"). Schema pushed (18 tables), seeded with 7 users, 11 plans, **53 properties + varied galleries**, 8 leads (→ Priya), 5 tickets, 2 site visits + favorites (→ Rohan), 3 subscriptions. `DATABASE_URL` set in Vercel (Neon integration disconnected). Same box also serves local dev via root `.env`, so local now hits prod data.  
> ⚠️ VPS-as-prod follow-ups: open port 5433 to Vercel (dynamic IPs → effectively public), add `?sslmode=require` (traffic currently unencrypted), add PgBouncer before real traffic (serverless connection limits). Neon (06-12, now retired) can be deleted once VPS cutover is verified.  
**Auth:** ✅ Verified end-to-end against the live DB — login/loginStaff (bcrypt), role enforcement, and protected-procedure auth guard all confirmed working.

> ⚠️ DB password contains an `@` — it MUST be percent-encoded as `%40` in the connection string or the URL parser reads the host wrong. The root `.env` already uses the encoded form.

---

## ✅ Completed

### Infrastructure
- [x] Turborepo monorepo (`apps/web`, `apps/api`, `packages/db`, `packages/trpc`, `packages/shared`)
- [x] tRPC v11 route handler at `/api/trpc` (Next.js App Router)
- [x] `Providers.tsx` — `QueryClientProvider` + `trpc.Provider`, reads Bearer token from `localStorage`
- [x] `next.config.ts` `webpack.resolve.extensionAlias` maps `.js` → `.ts`/`.tsx`, so trpc package imports keep `.js` extensions (works for both webpack and standalone Node)
- [x] `transpilePackages: ["@nxtsft/trpc", "@nxtsft/db", "@nxtsft/shared"]`
- [x] `prisma.config.ts` in `packages/db` (Prisma 7-ready config)
- [x] `.env.example` with required keys
- [x] **Vercel deploy** *(06-11)* — deploys `apps/web` only (it hosts the site **and** the API via `/api/trpc` + `/api/v1/*`; Fastify `apps/api` is not deployed). Set Vercel **Root Directory = `apps/web`** and env var `DATABASE_URL`. Prisma client is generated on Vercel via `packages/db` `postinstall: prisma generate`; `schema.prisma` `binaryTargets` includes `rhel-openssl-3.0.x` for the Vercel runtime. Full guide: `docs/DEPLOYMENT.md`.
  - ⚠️ Serverless connection pooling not yet hardened (`pg.Pool` opens per function instance) — use a pooled `DATABASE_URL` + cap pool `max` before real traffic.
  - **Prod DB = teammate's VPS PostgreSQL** *(06-13)* — moved off Neon (now retired). `DATABASE_URL` set manually in Vercel to `postgresql://appuser:thec%40valli@187.77.185.220:5433/nxtsft` (`@`→`%40`); Neon integration disconnected. Still accessed via Prisma (ORM unchanged). See Overall Status for the VPS-as-prod follow-ups (firewall/SSL/pooling).
- [x] **Property catalog + browse UX** *(06-12)* — seed expanded to **53 listings** spanning all 12 home cities (3-6 each) and BHK buckets 1→6; each gets a varied 4-5 image gallery. `/properties` shows the true filtered **total** (not just loaded count); listing cards + detail page have image **carousels**. Home "Trending" reveal-animation fixed (async cards now observed); press marquee moved above the KPI band.

### Database (`packages/db`)
- [x] Prisma schema: `User`, `Session`, `Property`, `Location`, `Lead`, `Favorite`, `SiteVisit`, `CreditTransaction`, `Plan`, `Subscription`, `Payment`, `Ticket`, `Notification`
- [x] Seed file (`prisma/seed.ts`) — 5 staff + 2 consumer demo users, seeker plans
  - `sa@nxtsft.com` / `admin@nxtsft.com` / `supervisor@nxtsft.com` / `priya@nxtsft.com` / `support@nxtsft.com`
  - `rohan@example.com` / `ananya@example.com`
  - All passwords: `demo1234` (bcrypt cost 12)

> **To activate DB:** Set `DATABASE_URL` in `apps/api/.env`, then:
> ```
> pnpm --filter @nxtsft/db prisma migrate dev --name init
> pnpm --filter @nxtsft/db db:seed
> ```

### tRPC Routers (`packages/trpc/src/routers/`)

13 routers mounted in `index.ts`. Procedure guards: `publicProcedure`, `protectedProcedure`, `staffProcedure`, `adminProcedure`, `superAdminProcedure`.

- [x] `auth` — `register`, `login`, `loginStaff`, `logout`, `me`
- [x] `properties` — `list` (infinite, featured filter), `get`, `create`, `update`, `approve`, `toggleFeatured`, `unlockContact`
- [x] `leads` — `create`, `list` (staff-scoped), `get`, `updateStatus`, `addNote`, `assign`, `scheduleVisit`, `bulkAssign`, `stats`
- [x] `users` — `me`, `updateProfile`, `credits`, `addCredits`, `favorites`, `addFavorite`, `removeFavorite`, `siteVisits`, `changePassword`, `myListings`, `sessions`, `terminateSession`, `toggleTwoFactor`
- [x] `subscriptions` — `plans`, `plan`, `createOrder`, `verifyPayment`, `myCurrent`, `cancel`, `createPlan`, `updatePlan`, `deletePlan`, `adminList`
- [x] `admin` — `stats`; `users.{list,get,updateRole,verify}`; `properties.{list,approve}`; `leads.list`; `auditLog`; `teamMembers`; `createTeamMember`
- [x] `tickets` — `create`, `list`, `update`
- [x] `notifications` — `list`, `markRead`
- [x] `siteVisits` — `list`, `create`, `reschedule`, `cancel`, `complete` *(added 06-10)*, `mapData` (staff-only, batch-joins property coords + rep) *(added 06-17)*
- [x] `searchAlerts` — `list`, `create`, `update`, `delete`, `toggle` *(added 06-10)*
- [x] `reviews` — `list`, `create`, `markHelpful` *(added 06-10)*
- [x] `superAdmin` — `stats`, `systemHealth`, `securityLog`, `failedLogins`, `logFailedLogin`, `sessionTerminateGlobal`, `getIpRules`, `updateIpRules`, `getPolicyConfig`, `updatePolicyConfig`, `broadcastNotification` *(added 06-10)*, `getPermissionMatrix`, `updatePermissionMatrix` *(added 06-17, AuditLog-as-config pattern)*
- [x] `propertyViews` — `record` (public, anon-friendly), `mine` (user history+stats), `analytics` (staff) *(added 06-10, mine — backed by new `PropertyView` model)*

> ⚠️ **Backend-only:** the 4 new routers (`siteVisits`, `searchAlerts`, `reviews`, `superAdmin`) and the new procedures on `admin`/`users`/`subscriptions`/`leads` are implemented server-side but **not yet consumed by any frontend page**. See "Remaining" for the frontend wiring still owed.

### Auth Flow (`src/lib/auth.tsx`)
- [x] `AuthProvider` uses vanilla `createTRPCClient` (not React hooks) for server calls
- [x] `signIn(email, password)` → `auth.login` tRPC mutation
- [x] `signInStaff(email, password)` → `auth.loginStaff` tRPC mutation
- [x] `signOut()` → `auth.logout` tRPC mutation
- [x] `register(name, email, phone, password, city)` → `auth.register` tRPC mutation
- [x] Token stored at `nxtsft.token` in `localStorage`
- [x] Credits at `nxtsft.credits` (survives sign-out)

### Public Site Pages

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Wired | Featured carousel → `trpc.properties.list({ featured: true })` |
| `/properties` | ✅ Wired | Infinite scroll → `trpc.properties.list` with filters |
| `/properties/[slug]` | ✅ Wired | `trpc.properties.get`, unlock contact, add/remove favorite |
| `/login` | ✅ Wired | `signIn()` via AuthProvider → real DB |
| `/register` | ✅ Wired | `register()` via AuthProvider → real DB |
| `/admin-login` | ✅ Wired | `signInStaff()` via AuthProvider → real DB |
| `/pricing` | ✅ Wired | `trpc.subscriptions.plans`, `createOrder`, `verifyPayment` |
| `/list` | ✅ Wired | `trpc.properties.create` on submit (logged-in); local fallback |
| `/profile` | ✅ Wired | `trpc.users.updateProfile` on save |
| `/contact` | ✅ Done | Controlled form, validation, success screen |
| `/agents` | ✅ Static | Uses `AGENTS` fixture (`src/data/agents.ts`) |
| `/agents/[slug]` | ✅ Static | Uses `AGENTS` + static properties |
| `/owners/[slug]` | ✅ Static | Uses static properties |
| `/refer` | ✅ Done | Full referral program UI |
| `/about` | ✅ Done | `AboutContent.tsx` (345 lines) |
| `/terms` `/privacy` `/cookie-policy` `/fraud-advisory` | ✅ Done | Legal pages |

### Portals

| Portal | Route | Auth Guard | tRPC Wiring |
|---|---|---|---|
| User | `/user-portal` | ✅ | Overview stats, Saved (favorites), Credits (balance + top-up), Profile (updateProfile), Visits |
| Admin | `/admin-portal` | ✅ | Stats, Listings (list + approve), Leads, Team |
| Sales | `/sales-portal` | ✅ | MyLeads (scoped to user), Click-to-Call, Reports name |
| Supervisor | `/supervisor-portal` | ✅ | TeamLeads (all leads), Reports name, Visit Calendar (live `siteVisits.mapData` + Mapbox geographic map) |
| Support | `/support-portal` | ✅ | Auth guard only — tabs still static |
| Super Admin | `/sa-portal` | ✅ | Command Dashboard stats |

---

## 🔲 Not Yet Done / Remaining

### Frontend Data Wiring (backend endpoints exist — frontend not yet consuming them)
- [x] Supervisor portal — Dashboard KPIs → `trpc.leads.stats` ✅ *(06-10, verified live)* — open/hot/converted/conversion-rate/total/lost from real pipeline counts. "Team Members — Live Status" list stays static (supervisors can't call admin-only `teamMembers`; per-rep online/calls have no backend)
- [x] Support portal — Dashboard, Ticket Queue, Escalations, My Assignments → `trpc.tickets.{stats,list,update}` ✅ *(06-10, full workflow + consumer scoping verified live)* — Dashboard KPIs from `stats`; Queue with status/category/search filters, Resolve (→resolved) & Escalate (→priority urgent) actions, CSV export; Escalations = high/urgent priority; My Assignments filtered to `assignedTo === session.id`. **TAT Report + Knowledge Base stay static** (no backend: no TAT-metric aggregates, no KB article model). Escalation modelled as priority (DB has no "Escalated" status); city/supervisor/TAT columns dropped (not in DB schema).
- [x] SA portal — Command Dashboard (§10.1) → `trpc.superAdmin.stats` + `systemHealth` ✅ *(06-10, verified live)* — KPIs (users/active-sessions/revenue) + live System Health panel (uptime, DB, cache, Razorpay/R2/SMS)
- [x] SA portal — User Management → `trpc.admin.users.list` + inline `updateRole` (super-admin) + `verify` ✅ *(06-10, verified live)* — search/role filters, CSV, role enforcement confirmed ("Super-admin access only")
- [x] SA portal — Security Console (§10.10) → `trpc.superAdmin.{failedLogins,securityLog,getIpRules,updateIpRules,getPolicyConfig,updatePolicyConfig}` ✅ *(06-10, verified live)* — failed-login feed, security log, IP whitelist/blacklist editor, password+2FA policy editor
- [x] SA portal — Notifications (§10.8) → `trpc.superAdmin.broadcastNotification` ✅ *(06-10, verified live)* — broadcast composer (title/message/audience-role); surfaces via the new notification bell
- [x] SA portal — Plans Manager (§10.13) → `trpc.subscriptions.{plansAdmin,createPlan,updatePlan,deletePlan}` ✅ *(06-10, verified live)* — DB-backed plan groups (seeker/owner-rent/owner-sell), inline edit/create/activate/deactivate; added admin-only `plansAdmin` query (lists inactive too)
- [x] SA portal — Audit Trail (§10.6) → `trpc.admin.auditLog` ✅ *(06-10, verified live)* — adapted to real `AuditLog` model (Time/Actor/Action/Entity/IP; dropped fake severity/outcome); 6 demo audit entries seeded
- [x] Admin portal — Team Management (§6.2) → `trpc.admin.teamMembers` + `createTeamMember` ✅ *(06-10, verified live)* — role filter + search, real "Add Member" modal creates a working staff login; removed dead static roster/PerfBar code
- [x] User portal — Alerts tab → `trpc.searchAlerts.{list,create,toggle,delete}` ✅ *(06-10, full CRUD verified live)* — adds inline create form (name/city/BHK/budget/frequency), pause/resume, delete; no fake "match count" (no backend match job yet)
- [x] User portal — Listings tab → `trpc.users.myListings` + `properties.update` for Deactivate/Reactivate ✅ *(06-10, verified live)* — real status/views/price, loading + empty states; Boost is a toast (paid, not built), Edit→View links to live detail page
- [x] User portal — Site Visits → `trpc.siteVisits.{reschedule,cancel}` ✅ *(06-10, verified live)* — `users.siteVisits` enriched with a manual property join (title/image/city); upcoming cards get inline datetime reschedule + cancel; past visits read-only
- [x] User portal — Removed the redundant `#search` "Saved Searches" tab (nav entry, route case, component, unused `Search` import) ✅ *(06-10)* — `#alerts` is now the single source of truth
- [x] User portal — Recently Viewed (§5.3) → `trpc.propertyViews.mine` ✅ *(06-10, verified live)* — real view history + stats (total/contacts-unlocked/cities/avg-dwell); records on property-detail unmount with real dwell time + final unlock state (anon-friendly)
- [x] Admin portal — Property Views Analytics (§6.7) → `trpc.propertyViews.analytics` ✅ *(06-10, verified live)* — total/unique/unlock-rate KPIs, views-by-property bars, searchable records + CSV (dropped Lead column — `PropertyView` has no leadId)
- [x] Profile page — Security panel → `trpc.users.{changePassword,sessions,terminateSession,toggleTwoFactor}` ✅ *(06-10, verified live)* — inline change-password form, live 2FA toggle, active-sessions list with per-session sign-out; added `twoFactorEnabled` to `safeUserSelect` so `users.me` exposes it
- [x] User portal — KYC tab → `trpc.users.kyc.{myDocuments,submit}` ✅ *(06-22)* — upload Aadhaar/PAN/Income Proof (image or PDF ≤5 MB via R2); shows per-doc status badge + admin notes; re-upload resets to pending
- [x] Property detail — Reviews section → `trpc.reviews.{list,create,markHelpful}` ✅ *(06-10, verified live)* — new full-width section: avg rating + count, interactive star write-form (1 review/user, server CONFLICT-guarded), helpful button, loading/empty states
- [x] Admin portal — Subscriptions (§6.6) → `trpc.subscriptions.adminList` + `cancel` ✅ *(06-10, verified live)* — plan-purchases table (user/plan/amount/status), status filter, cancel action; unlock-records/disputes sections left static (no backend). **Fixed BigInt-serialization bug in `subscriptions.cancel`/`myCurrent`** (returned raw Prisma rows → tRPC 500)
- [x] Admin portal — CRM Pipeline (§6.5) → `trpc.admin.leads.list` + `leads.updateStatus` ✅ *(06-10, verified live)* — live kanban over real `Lead.status` enum (New/Hot/Warm/Cold/Converted/Lost) with per-card stage move; removed dead static `pipeline`/`leadMeta`. (DB has no funnel-stage model, so columns = the status enum that actually persists)
- [x] Notification Bell → `trpc.notifications.{unreadCount,list,markRead,markAllRead}` ✅ *(06-10, verified live)* — reusable `NotificationBell` in both PortalShell + SiteHeader; unread badge (60s poll), dropdown, mark-read/all-read. Closes the loop on SA broadcast
- [x] Agents page + agent detail page → live DB *(06-22)* — `getAgents` + `getAgent` tRPC procedures (publicProcedure); slug-based `/agents/[slug]` routes render from DB. Fixed recursive Prisma `Json` type by returning explicit typed objects from router.
- [x] Home page — KPI band count-up (§4.1) ✅ *(06-10)* — `KpiBandStat` animates on scroll (decimal-aware, locale-formatted, gold gradient) for all 6 band stats
- [x] Subscriptions — "My current plan" UI (§5.4) → `trpc.subscriptions.{myCurrent,cancel}` ✅ *(06-10, verified live)* — user portal Credits tab "Active Plan" section: name/amount/start/expiry/days-left + Renew-Upgrade + Cancel
- [x] Property detail — Lead inquiry form → `trpc.leads.create` ✅ *(06-10, verified live)* — "Interested in this property?" sidebar form (name/phone/notes), prefills user name + property interest, signed-out → /login, success state; creates New/Portal lead flowing into CRM

### Fix: Vercel "Prisma Query Engine not found" *(06-17)*
- [x] Production login failed with `Query Engine for runtime "rhel-openssl-3.0.x"` not found. DB was up (verified live); root cause = Next/@vercel/nft not tracing the Prisma `.so.node` (loaded via runtime path) into the `/api/**` function bundle.
- [x] Fix (part 1): `outputFileTracingIncludes["/api/**"]` in `next.config.ts` force-includes `libquery_engine-rhel-openssl-3.0.x.so.node`. Worked locally but **not on Vercel**.
- [x] Fix (part 2): pinned `outputFileTracingRoot: path.join(__dirname, "../../")` (Root Directory = apps/web otherwise defaults the trace root to apps/web). Still failed — the brittle `../../node_modules/...` include globs weren't matching on Vercel.
- [x] Parts 1-3 (tracing-based fixes) all FAILED on Vercel — file tracing won't reliably bundle the native engine under Root Directory = apps/web.
- [x] **Fix (final, the one that works): upgraded to Prisma 7 — engine-free.** `@prisma/client`/`prisma` → ^7.8.0 (adapter-pg was already 7.8.0). v7 replaces the Rust query engine with a base64-embedded WASM query compiler that runs through the pg driver adapter, so there is **no native `.so.node` to bundle** — the "Query Engine not found" error is impossible. Schema: dropped `binaryTargets` and `datasource.url` (url now sourced from `prisma.config.ts`, required by v7). Blast radius tiny — only `packages/db/client.ts` imports `@prisma/client`.
  - **Proven locally:** deleted every engine binary (0 remaining) → `findUnique`, `count`, BigInt price, and a relation query all succeed. trpc typecheck ✓, web build ✓, query compiler (`query_compiler_fast_bg.wasm-base64.js`) traced into the function. Build still runs `prisma generate` (now produces the v7 engine-free client).
  - Cleaned up `next.config.ts`: removed the obsolete engine `outputFileTracingIncludes`; kept `outputFileTracingRoot`; excludes now trim non-Postgres query compilers.
- Dead ends ruled out: `queryCompiler` preview on the legacy `prisma-client-js` v6 generator (still demanded the native engine) and `@prisma/nextjs-monorepo-workaround-plugin` (emits nothing when `@prisma/client` is external).

### Super Admin — Role & Permission Matrix *(06-17)*
- [x] `PermissionsTab` rebuilt from boolean toggles → 4-level matrix (none/read/write/admin) over 12 features × 6 roles (super-admin = implicit full). Color-coded cells cycle on click; legend; Save/Reset with dirty tracking + "last saved".
- [x] **Simulate as role X** — role picker shows effective access (summary count chips + per-feature plain-English capability).
- [x] Persisted via `superAdmin.getPermissionMatrix`/`updatePermissionMatrix` (AuditLog `entity: "PermissionMatrix"`, no schema change). Loads saved snapshot, merges over per-role defaults.
- Verified: tRPC type-check ✓, web type-check ✓, build ✓. **Note:** this is the authoring/simulation surface — enforcing levels in each portal's route guards is a separate pass (not yet done).

### Maps — Mapbox *(06-17)*
- [x] Property detail (`/properties/[slug]`) — "Location" section with a single pin → `PropertyMap` (Mapbox GL via `react-map-gl`). Reads `location.latitude/longitude` from `properties.get`.
- [x] Supervisor Visit Calendar — geographic rep view → `VisitsMap` (markers colour-coded per sales rep, click popups, legend), driven by new `siteVisits.mapData`. Tab rebuilt to live data (stat row + map + visit list).
- [x] `lib/map.ts` — shared token/style/`resolveCoords`/colour palette. **City-centroid fallback** for listings still at `0,0` (pins land in the right city + "Approximate location" badge instead of the Gulf of Guinea).
- [x] `next.config.ts` CSP extended for Mapbox (blob workers + `api.mapbox.com`/`events.mapbox.com`/`*.tiles.mapbox.com`). Token = `NEXT_PUBLIC_MAPBOX_TOKEN` (in `apps/web/.env.local`; must also be set in Vercel env + redeploy).
- Verified: tRPC type-check ✓, web type-check ✓, `pnpm --filter @nxtsft/web build` ✓. Browser-level tile render still owed (needs dev-server restart to pick up env + CSP).

### Design System / Polish *(06-10)*
- [x] `ui/select.tsx` — branded Radix Select (animated, accent focus, check-marked item, sm/md, mobile/keyboard accessible). Added `@radix-ui/react-select` dep
- [x] `ui/skeleton.tsx` — added `TableSkeleton`, `CardGridSkeleton`, `ListSkeleton`
- [x] `ui/load-more.tsx` — `LoadMore` cursor-pagination control (spinner + "showing N of M")
- [x] Applied: `/properties` (CardGridSkeleton + LoadMore); polished `Select` on Admin Team/Subscriptions + SA Users filters (`__all` sentinel for the reserved empty value)
- [x] Rolled `Select` across ~20 native dropdowns ✅ *(06-10)* — user-portal (7), sales (1), support (2), supervisor (4), admin (3: CRM card + invite role/city), sa (3: row-role/broadcast/complexity), agents sort, ReportsDashboard (×4 portals), /list + /register city. Empty options handled via `__all`/`__any` sentinels or Radix placeholder. Only the SA invite *demo* modal (uncontrolled, non-functional) left native

### Backend / DB
- [x] `DATABASE_URL` configured in gitignored root `.env` (`%40`-encoded password) — connection verified
- [x] Schema present in DB (now **19 tables**) — pushed by teammate; **no local migrations folder** (so don't run `migrate dev` blindly — it's a shared DB; use `prisma db push` for additive changes)
- [x] Added `PropertyView` model (additive — new table + relation fields on User/Property; no structural change to existing tables) and `prisma db push`'d to the shared DB *(06-10)*
- [x] Seeded: 7 users + 11 plans, **10 properties / 8 leads / 5 tickets / 2 visits + favorites** ✅ *(06-10)* — all idempotent (upsert by slug / stable ids), verified live: home carousel 4 featured, /properties 10, sales leads 8, support 5 tickets, rohan owns 3 listings
- [x] Fixed `seed.ts` — it used a bare `new PrismaClient({ adapter: ... process.env.DATABASE_URL })` but nothing loaded `.env` for `tsx` (SASL "password must be a string"). Now imports the configured `../client.js` (env walk-up + pg adapter)
- [ ] Razorpay keys needed for real payment flow (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`)
- [ ] R2 credentials for media uploads (`CLOUDFLARE_R2_*`)

### Features
- [ ] Image upload on `/list` (currently no gallery upload UI)
- [x] Lead creation from property detail page → `trpc.leads.create` ✅ *(06-10, verified live)* — inquiry form in detail sidebar; see "Property detail — Lead inquiry form" above
- [ ] Notifications bell → `trpc.notifications.list`
- [ ] Email / SMS OTP verification on register
- [ ] EMI Calculator tab (user portal) — UI exists but calc is static

### KYC, Credit Usage & Activity Tracking *(06-22)*
- [x] **KYC document upload** — `KycDocument` Prisma model (per-doc status + admin notes); `users.kyc.{myDocuments,submit}` for buyers/sellers; `KYCTab.tsx` rewritten (real upload via `media.uploadImage` → R2); PDF support added to `media.ts`
- [x] **KYC admin review** — `admin.users.{kycList,updateDocStatus,setUserKycStatus}`; new `KYCReviewTab.tsx` in admin portal (filter by status, expand per-user, mark individual docs, set overall profile KYC status + notify user)
- [x] **Credit usage tracking** — `admin.creditUsage` reads `CreditTransaction(reason="contact_unlock")`, batch-joins buyer + property; new `UsageSection` in `CreditsTab.tsx` shows who spent which credit on which property
- [x] **Buyer activity feed** — `admin.buyerActivity` reads `PropertyView` filtered to `role="user"`, paginated with search; `BuyerActivitySection` added to `ViewsTab.tsx` — full chronological feed of every property a buyer viewed, with dwell time and contact-unlock indicator
- [x] **User portal UX** — "My Listings" nav item hidden from Home Buyers (only shown to `home-seller`); `MyListingsTab` guards against non-seller access; `NotificationBell` refreshes immediately on open + polls at 30 s

### 5-Feature Sprint *(06-22)*
- [x] **Agent live DB** — `/agents` fetches from DB via `users.getAgents`; `/agents/[slug]` fetches via `users.getAgent`. Seed includes 15 agents with full metadata (slug, rating, deals, specialties, cities, languages). Router returns explicit flat types (no recursive Prisma `Json`) to avoid tRPC type-depth limit.
- [x] **RERA validation** — `apps/web/src/lib/rera.ts` (city→state map + state-specific regex patterns); wired into `/list` step-3 form and `properties.create` tRPC mutation (server-side guard). New Prisma models: `Campaign`, `ModelVersion`, `CmsPage`; `User.slug` field; schema pushed + seeded.
- [x] **CRM kanban drag-and-drop** — `CRMTab.tsx` replaced Select dropdown with `@hello-pangea/dnd` (DragDropContext/Droppable/Draggable). Optimistic UI: local `leads` state + revert on error. Fixed `DraggingStyle` type conflict + `useMemo` for `serverLeads`.
- [x] **Campaign builder** — `campaigns` tRPC router (`list`/`create`/`updateStatus`); `MarketingTab.tsx` shows live StatCards (budget/leads/CPL) + campaign table with pause/resume + create modal.
- [x] **SA live tabs** — `BillingTab.tsx` (MRR/ARR/outstanding/payments via `superAdmin.billingStats`), `AITab.tsx` (model registry + deploy/rollback via `superAdmin.modelVersions`), `CMSTab.tsx` (pages + publish/create via `superAdmin.cmsPages`).

### Note on `/list` RERA validation (added 06-10)
- [x] Step 3 now requires a RERA number and validates its format before submit (CLAUDE.md §12 compliance)
- [x] `properties.create` sends `rera` as a required field

---

## E2E Test Checklist (run before every commit/push)

> Run `pnpm dev` in `D:/LookAround/8. Nxtsft`, open `http://localhost:3000`

### ✅ API-level verified against live DB (2026-06-10)
- [x] `auth.login` — `rohan@example.com`/`demo1234` → token + user (Rohan Mehta, 3 credits)
- [x] `auth.loginStaff` — `admin@nxtsft.com`/`demo1234` → admin (Meera Iyer)
- [x] `auth.loginStaff` rejects consumer account → "Use the consumer login page."
- [x] `auth.login` rejects wrong password → "Invalid email or password."
- [x] `subscriptions.plans({type:"seeker"})` → Instant / Basic / Premium
- [x] `properties.list` → valid empty response (0 items)
- [x] `users.credits` WITH token → balance 3
- [x] `users.credits` WITHOUT token → blocked "Sign in to continue."

> Browser-level UI clicks below still owed (the API path underneath them is now confirmed):

### Auth
- [ ] `/register` — create a new user, verify redirect to `/user-portal`
- [ ] `/login` — sign in as `rohan@example.com` / `demo1234`, verify credit balance shows
- [ ] `/admin-login` — sign in as `admin@nxtsft.com` / `demo1234`, verify redirect to `/admin-portal`
- [ ] Sign out from any portal, verify redirect to login page
- [ ] Direct nav to `/user-portal` while logged out → redirects to `/login`
- [ ] Direct nav to `/admin-portal` while logged out → redirects to `/admin-login`

### Public Site
- [ ] `/` — Featured carousel loads (or shows skeleton if DB empty)
- [ ] `/properties` — Grid loads, search/filter works, load-more works
- [ ] `/properties/[slug]` — Property detail renders; "Unlock Owner Contact" gate appears
- [ ] `/pricing` — Seeker plans load from DB; "Buy" triggers order flow
- [ ] `/contact` — Fill form, click Send, see success screen
- [ ] `/list` — Fill 4-step form, submit; logged-in user → saves to DB

### User Portal (sign in as `rohan@example.com`)
- [ ] Overview tab — credit balance matches DB
- [ ] Credits tab — balance visible; "Top Up" opens plan modal
- [ ] Saved tab — favorites list loads (empty if none added)
- [ ] Visits tab — site visits list loads
- [ ] Profile tab — edit name/phone, Save → persists

### Staff Portals (sign in as respective demo users)
- [ ] Admin (`admin@nxtsft.com`) → `/admin-portal` — Stats cards show DB values
- [ ] Admin → Listings tab — DB listings shown; Approve button works
- [ ] Admin → Leads tab — DB leads listed
- [ ] Sales (`priya@nxtsft.com`) → `/sales-portal` — MyLeads shows assigned leads
- [ ] Supervisor (`supervisor@nxtsft.com`) → `/supervisor-portal` — TeamLeads table loads
- [ ] Support (`support@nxtsft.com`) → `/support-portal` — renders without crash
- [ ] Super Admin (`sa@nxtsft.com`) → `/sa-portal` — Command Dashboard stat cards load

### Credit Gate
- [ ] On a property detail page, click "Unlock Owner Contact" — credit deducted, phone revealed
- [ ] With 0 credits, gate shows "insufficient credits" message

### Build Health
- [ ] `pnpm --filter @nxtsft/web build` — zero TypeScript errors, zero route errors
