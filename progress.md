# NxtSft — Build Progress

> Last updated: 2026-06-10
> Stack: Next.js 15 · tRPC v11 · Prisma 6 · PostgreSQL 16 · Tailwind CSS 4

---

## Overall Status

**Phase:** v1.0 Demo / Prototype  
**DB:** ✅ LIVE — shared remote PostgreSQL 18 (`DATABASE_URL` in gitignored root `.env`). Schema pushed (18 tables), seeded with 7 users, 11 plans, **10 properties (4 featured), 8 leads (→ Priya), 5 tickets, 2 site visits + favorites (→ Rohan)** *(06-10)*.  
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
- [x] `siteVisits` — `list`, `create`, `reschedule`, `cancel`, `complete` *(added 06-10)*
- [x] `searchAlerts` — `list`, `create`, `update`, `delete`, `toggle` *(added 06-10)*
- [x] `reviews` — `list`, `create`, `markHelpful` *(added 06-10)*
- [x] `superAdmin` — `stats`, `systemHealth`, `securityLog`, `failedLogins`, `logFailedLogin`, `sessionTerminateGlobal`, `getIpRules`, `updateIpRules`, `getPolicyConfig`, `updatePolicyConfig`, `broadcastNotification` *(added 06-10)*
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
| Supervisor | `/supervisor-portal` | ✅ | TeamLeads (all leads), Reports name |
| Support | `/support-portal` | ✅ | Auth guard only — tabs still static |
| Super Admin | `/sa-portal` | ✅ | Command Dashboard stats |

---

## 🔲 Not Yet Done / Remaining

### Frontend Data Wiring (backend endpoints exist — frontend not yet consuming them)
- [ ] Supervisor portal — Dashboard stat cards → `trpc.leads.stats` + `trpc.admin.teamMembers` (still computes from static `teamMembers`)
- [x] Support portal — Dashboard, Ticket Queue, Escalations, My Assignments → `trpc.tickets.{stats,list,update}` ✅ *(06-10, full workflow + consumer scoping verified live)* — Dashboard KPIs from `stats`; Queue with status/category/search filters, Resolve (→resolved) & Escalate (→priority urgent) actions, CSV export; Escalations = high/urgent priority; My Assignments filtered to `assignedTo === session.id`. **TAT Report + Knowledge Base stay static** (no backend: no TAT-metric aggregates, no KB article model). Escalation modelled as priority (DB has no "Escalated" status); city/supervisor/TAT columns dropped (not in DB schema).
- [ ] SA portal — Dashboard → `trpc.superAdmin.stats` + `trpc.superAdmin.systemHealth`
- [ ] SA portal — Users tab → `trpc.admin.users.list` (+ `updateRole`, `verify`)
- [ ] SA portal — Security console → `trpc.superAdmin.{securityLog,failedLogins,getIpRules,updateIpRules,getPolicyConfig,updatePolicyConfig}`
- [ ] SA portal — Notifications → `trpc.superAdmin.broadcastNotification`
- [ ] SA portal — Plans Manager tab → `trpc.subscriptions.{adminList,createPlan,updatePlan,deletePlan}`
- [ ] Admin portal — Audit tab → `trpc.admin.auditLog`; Team tab → `trpc.admin.{teamMembers,createTeamMember}`
- [x] User portal — Alerts tab → `trpc.searchAlerts.{list,create,toggle,delete}` ✅ *(06-10, full CRUD verified live)* — adds inline create form (name/city/BHK/budget/frequency), pause/resume, delete; no fake "match count" (no backend match job yet)
- [x] User portal — Listings tab → `trpc.users.myListings` + `properties.update` for Deactivate/Reactivate ✅ *(06-10, verified live)* — real status/views/price, loading + empty states; Boost is a toast (paid, not built), Edit→View links to live detail page
- [ ] User portal — Site Visits → `trpc.siteVisits.{list,reschedule,cancel}` (currently read-only via `users.siteVisits`)
- [x] User portal — Removed the redundant `#search` "Saved Searches" tab (nav entry, route case, component, unused `Search` import) ✅ *(06-10)* — `#alerts` is now the single source of truth
- [x] User portal — Recently Viewed (§5.3) → `trpc.propertyViews.mine` ✅ *(06-10, verified live)* — real view history + stats (total/contacts-unlocked/cities/avg-dwell); records on property-detail unmount with real dwell time + final unlock state (anon-friendly)
- [x] Admin portal — Property Views Analytics (§6.7) → `trpc.propertyViews.analytics` ✅ *(06-10, verified live)* — total/unique/unlock-rate KPIs, views-by-property bars, searchable records + CSV (dropped Lead column — `PropertyView` has no leadId)
- [ ] User portal — Profile security → `trpc.users.{changePassword,sessions,terminateSession,toggleTwoFactor}`
- [ ] User portal — KYC tab (stub, no backend yet)
- [ ] Property detail — Reviews section → `trpc.reviews.{list,create,markHelpful}`
- [ ] Subscriptions — "My current plan" UI → `trpc.subscriptions.{myCurrent,cancel}`
- [ ] Agents page — No tRPC router for agents; still uses `AGENTS` static fixture
- [ ] Home page — KPI band count-up (still static numbers)

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
- [ ] Lead creation from property detail page → `trpc.leads.create` (button exists but no form wired)
- [ ] Notifications bell → `trpc.notifications.list`
- [ ] Email / SMS OTP verification on register
- [ ] EMI Calculator tab (user portal) — UI exists but calc is static

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
