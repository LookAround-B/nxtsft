# NxtSft — Build Progress

> Last updated: 2026-06-09
> Stack: Next.js 15 · tRPC v11 · Prisma 6 · PostgreSQL 16 · Tailwind CSS 4

---

## Overall Status

**Phase:** v1.0 Demo / Prototype  
**DB:** PostgreSQL via Prisma (needs `DATABASE_URL` env var + migration + seed to activate)  
**Auth:** Real JWT sessions via tRPC — localStorage-backed token, server-side PostgreSQL `Session` table

---

## ✅ Completed

### Infrastructure
- [x] Turborepo monorepo (`apps/web`, `apps/api`, `packages/db`, `packages/trpc`, `packages/shared`)
- [x] tRPC v11 route handler at `/api/trpc` (Next.js App Router)
- [x] `Providers.tsx` — `QueryClientProvider` + `trpc.Provider`, reads Bearer token from `localStorage`
- [x] All relative imports in `packages/trpc/src/` use no `.js` extension (webpack compatibility)
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
- [x] `auth` — `signIn`, `signInStaff`, `signOut`, `register`, `me`
- [x] `properties` — `list` (infinite, featured filter), `get`, `create`, `update`, `approve`, `toggleFeatured`, `unlockContact`
- [x] `leads` — `create`, `list` (staff-scoped), `get`, `updateStatus`, `assign`
- [x] `users` — `credits`, `updateProfile`, `favorites`, `addFavorite`, `removeFavorite`, `siteVisits`
- [x] `subscriptions` — `plans`, `createOrder`, `verifyPayment`
- [x] `admin` — `stats`, `users.list`, `leads.list`, `listings.list`, `approve`
- [x] `tickets` — `create`, `list`, `update`
- [x] `notifications` — `list`, `markRead`

### Auth Flow (`src/lib/auth.tsx`)
- [x] `AuthProvider` uses vanilla `createTRPCClient` (not React hooks) for server calls
- [x] `signIn(email, password)` → `auth.signIn` tRPC mutation
- [x] `signInStaff(email, password)` → `auth.signInStaff` tRPC mutation
- [x] `signOut()` → `auth.signOut` tRPC mutation
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

### Data Wiring
- [ ] Supervisor portal — Dashboard stat cards (currently compute from static `teamMembers`)
- [ ] Support portal — Ticket Queue tab → `trpc.tickets.list`
- [ ] SA portal — Users tab → `trpc.admin.users.list`
- [ ] SA portal — Plans Manager tab → `trpc.subscriptions.plans` (read + edit)
- [ ] Agents page — No tRPC router for agents; still uses `AGENTS` static fixture
- [ ] User portal — Alerts tab (currently empty/static)
- [ ] User portal — Listings tab (user's own property listings)
- [ ] User portal — KYC tab (stub)
- [ ] Home page — KPI band count-up (still static numbers)

### Backend / DB
- [ ] `DATABASE_URL` must be set before any DB features work
- [ ] Run `prisma migrate dev --name init` + `db:seed`
- [ ] Razorpay keys needed for real payment flow (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`)
- [ ] R2 credentials for media uploads (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`)

### Features
- [ ] Image upload on `/list` (currently no gallery upload UI)
- [ ] Lead creation from property detail page (button exists but no form wired)
- [ ] Notifications bell → `trpc.notifications.list`
- [ ] Email / SMS OTP verification on register
- [ ] EMI Calculator tab (user portal) — UI exists but calc is static

---

## E2E Test Checklist (run before every commit/push)

> Run `pnpm dev` in `D:/LookAround/8. Nxtsft`, open `http://localhost:3000`

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
