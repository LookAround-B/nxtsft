# NxtSft — Engineering Guide (CLAUDE.md)

This is the single source of truth for how we build NxtSft. Read it before writing code.
If a rule here conflicts with something you're about to do, follow this file or raise the conflict — don't quietly diverge.

> **The 6-month test:** Before finalizing any change, ask: *"Would a new developer joining in 6 months still understand this?"* If not, refactor before you ship.

---

## 1. What we're building

**NxtSft** is an end-to-end real estate platform at `NxtSft.com`. It connects home buyers, property owners, and sales professionals through a unified, **role-based portal suite** — zero brokerage for buyers, verified listings, full-funnel CRM for sales teams, and a super-admin command centre.

- **PRD:** `docs/nxtsft_prd.pdf` — the product source of truth. Re-read the relevant section before building any feature.
- **Status:** v1.0, demo/prototype phase. Auth and data are localStorage-backed; production will swap in a server-side session/JWT system and a real database (Supabase or REST).

**Seven roles, six portals, one domain:**

| Role | Portal URL | Login |
|---|---|---|
| Super Admin (`super-admin`) | `/sa-portal` | `/admin-login` |
| Admin (`admin`) | `/admin-portal` | `/admin-login` |
| Supervisor (`supervisor`) | `/supervisor-portal` | `/admin-login` |
| Sales Rep (`sales`) | `/sales-portal` | `/admin-login` |
| Support Admin (`support-admin`) | `/support-portal` | `/admin-login` |
| Home Buyer (`user`) | `/user-portal` | `/login` |
| Customer / Concierge (`customer`) | `/user-portal` | `/login` |

Role assignment is fixed at login. Only admin / super-admin can change a user's role.

---

## 2. Tech stack

- **Framework:** Next.js 15 — App Router (React Server Components + Client Components)
- **Language:** TypeScript 5.8 — fully typed throughout, no `any`
- **Styling:** Tailwind CSS 4 + `tw-animate-css` for motion utilities
- **UI primitives:** Radix UI (Dialog, Tabs, Progress, Tooltip, Separator, Slot)
- **Icons:** Lucide React
- **Toasts:** Sonner
- **Auth:** React Context (`AuthProvider` / `useAuth`) — token stored in `localStorage`, verified against PostgreSQL `Session` table
- **API:** tRPC v11 route handler at `/api/trpc` (Next.js) + Fastify server at `apps/api` (port 3001)
- **Data:** PostgreSQL 16 via Prisma 6 (`packages/db`); R2 for media storage
- **Package manager:** `pnpm` — always use `pnpm add`, **never** `npm install`
- **Build:** Vercel-compatible; `pnpm dev / build / start`

---

## 3. Application structure

```
src/
  app/              # Next.js App Router — pages and layouts
  components/       # Shared UI (PortalShell, SiteHeader, SiteFooter, StatCard, Badge, Section, ReportsDashboard, ...)
  lib/              # AuthContext, hooks (useActiveHash), utilities
  data/             # Static JSON fixtures: properties, leads, teams, plans, etc.
```

Rules:
- **`src/app/`** holds routes only — minimal logic, just compose components.
- **`src/components/`** holds all reusable UI. Group by feature or shared primitives.
- **`src/lib/`** holds auth context, hooks, and pure utility functions.
- **`src/data/`** holds demo fixture files. Shape them to match the data models in §7 exactly.

---

## 4. Portal architecture

Every staff/user portal uses a **single shared shell component, `PortalShell`**, which renders the sidebar navigation, top header, role badge, and brand identity. Individual portals pass their `navItems` and `activeTab` state into the shell.

**Shared components (always reuse, never re-implement):**

| Component | Purpose |
|---|---|
| `PortalShell` | Full layout wrapper for all portals |
| `useActiveHash` | React hook — hash-driven active tab management |
| `StatCard` | KPI metric card: icon, value, label, optional delta |
| `Section` | Content block wrapper: title + optional action button |
| `Badge` | Status pill — tones: `hot`, `warm`, `cold`, `new`, `success`, `default` |
| `ReportsDashboard` | Shared reports panel with filter + CSV export; embedded in multiple portals |

**Role-based routing rules:**
- On sign-in, immediately redirect to `ROLE_META[role].portal`.
- Unauthenticated access to any portal URL → redirect to the appropriate login page.
- Staff roles → `/admin-login`; consumer roles → `/login`.

---

## 5. Authentication & session

**Demo implementation (current):**

| Key | Storage | Purpose |
|---|---|---|
| `nxtsft.session` | `localStorage` | Active session object |
| `nxtsft.credits` | `localStorage` | Credit balance (persists across sign-out) |
| `nxtsft.users` | `localStorage` | Registered user registry |

**Auth functions in `AuthProvider`:**

- `signIn(role)` — creates session from `ROLE_META`; grants 3 free credits to `user`/`customer` if balance is zero.
- `signOut()` — clears session; credits intentionally preserved.
- `register(name, email, phone)` — creates `user`-role session, persists to registry, grants 1 welcome credit.
- `updateProfile(name, phone)` — mutates session name, phone, initials.
- `addCredits(n)` — increments credit balance by `n`.
- `useCredit()` — decrements balance by 1; returns `false` if zero (contact-unlock gate).

**Production target:** replace `localStorage` with a secure server-side session or JWT. Keep `AuthProvider` interface identical so portal code changes are zero.

---

## 6. Engineering principles

We optimize for **fast iteration without technical debt**. Prioritize: **1) maintainability → 2) developer experience → 3) speed.**

- Write clean, readable, maintainable code. **Clarity over cleverness.** No overengineering.
- Keep components and hooks **small and focused** — one job each.
- **Meaningful names** for variables, files, and components. Names should explain intent.
- **Minimal comments.** Code is self-explanatory through good naming. Add a comment only when the *why* is genuinely non-obvious (a hidden constraint, a domain rule, a workaround). Never restate what the code already says.
- **Reuse** shared components (`PortalShell`, `StatCard`, `Badge`, `Section`, `ReportsDashboard`). Don't re-implement what already exists.
- No massive files. If a component is growing unwieldy, split it.
- **No hacky shortcuts.** If something feels messy, refactor it immediately.
- Always prefer **production-style implementation over demo-style placeholders.** Ship runnable, typed code.
- **Validate inputs.** Handle errors gracefully. Never expose raw error internals in UI.
- Point out risky decisions early. Suggest better patterns when you see them.

---

## 7. Core domain concepts & data models

These are the canonical shapes. Every fixture file and component must conform to them.

### Property
```ts
{
  id, slug, city, locality, lat, lng,
  price, priceLabel, pricePerSqft,
  bhk, bedrooms, bathrooms, balconies, parking, area,
  type,        // Apartment | Villa | Studio | Office | Bungalow | Plot | PG
  purpose,     // Sale | Rent
  image, gallery,   // hero image URL, up to 6 gallery URLs
  featured,    // boolean — home page carousel
  builder, matchScore, furnishing, facing, floor, age, possession, rera,
  description, amenities, nearby,
  owner: { name, role, phone, initials, rating, deals, since }
}
```

### Lead
```ts
{ id, name, phone, city, interest, status, source, owner, value, lastActivity }
// status: Hot | Warm | Cold | New
// source: Portal | WhatsApp | Referral | Direct
```

### Team Member
```ts
{ id, name, role, city, leadsOpen, closedMTD, conversion, target, achieved }
```

### Session (Auth)
```ts
{ role, name, email, initials, city, phone, joined }
```

### Plan (Seeker)
```ts
{ id, name, price, priceLabel, credits, validity, tagline, features, popular }
```

### Subscription
```ts
{ user, plan, start, expiry, creditsUsed, creditsTotal, nextPayment }
```

### Activity / Event
```ts
{ ts, user, action, outcome }
```

---

## 8. Subscription & monetisation rules

NxtSft runs a **dual-sided model**:
- **Buyers** purchase credit packs to unlock owner contact details.
- **Property owners** purchase listing plans for lead volume and visibility.

**Seeker plans:**

| Plan | Price | Credits | Validity |
|---|---|---|---|
| Instant | ₹99 | 1 | 30 days |
| Basic | ₹299 | 5 | 60 days |
| Premium | ₹699 | 15 | 90 days |

**Owner Rental / Sell plans:** 4 tiers — ₹499 / ₹999 / ₹2,499 / ₹4,999 with escalating listing counts and lead allocations.

**Credit gates:**
- Revealing an owner's phone/WhatsApp on a property detail page consumes 1 credit (`useCredit()`).
- New registration → 1 free welcome credit.
- Demo sign-in for `user`/`customer` role → 3 free credits (if balance is zero).
- Credits survive sign-out.

Never add free credits outside these three defined flows without an explicit product decision.

---

## 9. Portal-by-portal summary

Quick reference — full spec in `docs/nxtsft_prd.pdf`.

| Portal | Default tab | Nav tabs |
|---|---|---|
| User (`/user-portal`) | Overview Dashboard | 11 tabs: Overview, Saved, Recently Viewed, Credits, Alerts, Listings, Site Visits, EMI Calc, KYC, Profile |
| Admin (`/admin-portal`) | Operations Dashboard | 13 tabs: Dashboard, Team, Listings, Leads, CRM Pipeline, Subscriptions, Views Analytics, Click Alerts, Marketing, Builders, Reports, Plans, Commissions |
| Sales (`/sales-portal`) | My Leads | 8 tabs: Leads, Lead Detail, Activity Log, Click-to-Call, Site Visits, Commission, Listings, Reports |
| Supervisor (`/supervisor-portal`) | Team Dashboard | 8 tabs: Dashboard, Team Leads, Reassignment, Activity Monitor, Performance, Visit Calendar, Escalations, Reports |
| Support (`/support-portal`) | Dashboard | 6 tabs: Dashboard, Ticket Queue, Escalations, My Assignments, TAT Report, Knowledge Base |
| Super Admin (`/sa-portal`) | Command Dashboard | 15 tabs: Dashboard, Users, Teams, Config, Analytics, Audit, AI Control, Notifications, CMS, Security, Billing, Roles, Plans, Support Tickets, Reports |

**Shared `ReportsDashboard`** — embedded in Admin, Sales, Supervisor, and Super Admin portals. Scope data to the portal's access level; do not show data the role shouldn't see.

---

## 10. Public site pages

| Route | Purpose |
|---|---|
| `/` | Home — hero carousel, KPI band, featured properties, city cards, testimonials |
| `/login` | Consumer login (user / customer) |
| `/admin-login` | Staff login (all 5 staff roles) |
| `/register` | New buyer registration |
| `/properties` | Property listing + search/filter |
| `/properties/[id]` | Property detail — gallery, specs, owner unlock |
| `/agents` | Agents directory |
| `/agents/[slug]` | Agent profile |
| `/list` | List a property form |
| `/pricing` | Subscription plan comparison |
| `/profile` | User profile + settings |
| `/terms` `/privacy` `/cookie-policy` `/fraud-advisory` `/about` `/contact` | Legal & info pages |

Home page is **fully server-rendered** for SEO. Interactive sections (carousel, count-up KPIs) use Client Components.

---

## 11. Design conventions

**Brand tokens — define once in Tailwind config, never hard-code hex values in components:**

| Token | Use |
|---|---|
| Primary red/brand | CTAs, active states, RERA badges, key highlights |
| Dark/neutral | Sidebar background, text-on-light surfaces |
| Success green | Verified badges, positive deltas |

**Lead/status badge tones** — always use the `Badge` component:
- `hot` — urgent / high-priority leads
- `warm` — engaged leads
- `cold` — low-activity leads
- `new` — just created
- `success` — RERA verified, approved, resolved
- `default` — neutral status

**StatCard** — all KPI cards use the shared `StatCard` component. Pass `icon`, `value`, `label`, and optionally `delta`.

UI should feel **modern, minimal, professional**: strong spacing, clear hierarchy, consistent across all portals. Real estate buyers and sales teams need clarity and speed, not decoration.

---

## 12. RERA compliance rules

These must be enforced in code, not just in UI copy:

- Every property listing **must have a `rera` field** before it can be set to `Active`/`Approved`.
- The RERA number must be **displayed prominently** on property detail pages and agent profiles.
- The listing form at `/list` must **validate RERA format** before submit.
- The `Badge` component with `success` tone renders the RERA verified indicator.

---

## 13. Security

- No secrets in code or git. Use environment variables. Provide `.env.example` with keys only (no values).
- Validate and sanitize all user input — especially on `/register`, `/list`, and any form accepting free text.
- Never expose raw owner contact details without the credit gate (`useCredit()` returning `true`).
- Never log or display session tokens or raw credit counts in UI outside the designated credit components.
- Route guards: unauthenticated users accessing portal URLs must be redirected to the appropriate login page.

---

## 14. Workflow & definition of done

- **Package manager:** Always use `pnpm add <package> --filter <workspace>` to install deps. Never `npm install`.
- **Commit/push only when asked.** Descriptive, conventional commit messages.
- A change is **done** when: it builds, types pass, all relevant portal tabs render correctly, credit/auth gates work, and the 6-month test passes.
- Run formatter + linter before finishing (Prettier + ESLint). Consistent formatting across all files.
- If you add a new portal tab or public page, ensure it is registered in the portal's `navItems` and the role-based routing is correct.
- If you modify the auth flow, verify all seven role logins still work and redirect correctly.

---

*Mindset: NxtSft is a real product competing with established Indian real estate portals. Every decision balances speed, trust (RERA compliance, zero-brokerage promise), and UX for both buyers and sales professionals. When unsure, choose the option a new teammate would understand fastest — and that makes the product feel credible to a home buyer spending crores.*
