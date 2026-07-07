# NxtSft — Designer/Decor Monthly Listing Plan Billing
**Date:** 2026-07-07 | **Branch:** main | **Phase:** v1.0 demo

Sub-project 2 of 3 from the PG + Home Interiors gap analysis (`docs/NxtSft-PG & Home Interiors.pdf`; audit in memory `project_pg_interiors_audit`). Builds on sub-project 1 (`docs/superpowers/specs/2026-07-07-designer-lead-dashboard-design.md`, shipped as commit `bde0ea1`), which linked `InteriorDesigner`/`DecorStore` rows to their owning `User` and added the "My Business" tab.

---

## Scope

Interior Designers and Decor Stores currently list for free via self-serve submission + admin approval — no recurring billing exists. The spec calls for a "Monthly Listing Plan" (₹400–1,000/month).

**Key finding that shapes this design:** the existing owner-rent/owner-sell subscription plans that property owners already buy enforce **nothing** technically — no gating on listing creation, count, or visibility, no expiry cron. They're pure revenue-tracking (a `Subscription` + `Payment` row). Per your call, designer/decor billing follows the same pattern: **track, don't enforce.** A lapsed or never-purchased listing stays live exactly as it does today.

Also per your calls:
- Both Interior Designers and Decor Stores get billing (not just Interior Designers as the PDF literally describes).
- One flat monthly plan per vertical for v1 — no tiers, no featured/sponsored/portfolio-boost add-ons (the PDF itself frames those as "future").
- Billing is scoped to the **user's account**, not a specific listing — consistent with how owner-rent/sell plans already work, and avoids new complexity for the edge case of one user owning multiple designer/decor listings (allowed since sub-project 1).

---

## Data Model

No new tables. Two changes:

1. **`packages/trpc/src/sanitize.ts`** — extend `planTypeSchema`:
   ```ts
   export const planTypeSchema = z.enum(["seeker", "owner-rent", "owner-sell", "designer", "decor"]);
   ```
2. **Two new `Plan` rows** (DB-backed, via the existing Plans Manager admin UI — no new admin screen needed): a "Business Listing" plan for `type: "designer"` and one for `type: "decor"`. Suggested defaults: ₹499/month, 30-day validity, feature bullet "Stay listed on the Home Interiors / Decor directory." Admin can adjust price/copy afterward like any other plan.

---

## Backend (`packages/trpc/src/routers/subscriptions.ts`)

Three new procedures, mirroring `createOwnerOrder` / `createOwnerPayUOrder` / `verifyOwnerPayment` almost exactly — same no-credit, plain-`Subscription`-row shape — but sourcing the plan from the DB (`prisma.plan.findUnique`) instead of the hardcoded `OWNER_PLANS` array, so pricing changes don't require a code deploy:

- **`createBusinessOrder`** (Razorpay) — input `{ planId }`. Looks up `Plan` by id, requires `plan.type` to be `"designer"` or `"decor"` (reject otherwise — this endpoint isn't a generic "any plan" purchaser). Creates the Razorpay order + a `Payment` row exactly like `createOwnerOrder`.
- **`createBusinessPayUOrder`** (PayU) — same shape as `createOwnerPayUOrder`, same DB plan lookup. Crucially, sets `metadata: { ..., type: "owner_subscription", ... }` — **reusing the existing marker string as-is**. The PayU callback route (`apps/web/src/app/api/payu/callback/route.ts`) already branches generically on `meta.type === "owner_subscription"` to create a `Subscription` row from whatever `planId`/`planName`/`validityDays`/`cycle` is in the metadata — it has no owner-specific logic in that branch at all. **Zero changes needed to the callback route.**
- **`verifyBusinessPayment`** (Razorpay verify) — mirrors `verifyOwnerPayment`, DB-plan-sourced instead of `OWNER_PLANS`-sourced.

**New read query — `myBusinessSubscription`** (protectedProcedure): `prisma.subscription.findFirst({ where: { userId, status: "Active", plan: ... } })`. Note: `Subscription` has no relation to `Plan` (it denormalizes `planName` directly, no `planId` FK) — mirror the existing lookup approach in `myCurrent`, but filter by `planId` matching a `Plan` row whose `type` is `"designer"`/`"decor"` (fetch candidate designer/decor plan ids first, then filter subscriptions by `planId: { in: [...] }`). This exists because **`myCurrent` is not type-scoped today** — it returns whichever `Subscription` row is most recently created regardless of type, which would show the wrong thing for a user who is both a buyer (seeker plan) and a business owner (designer plan). Not fixing `myCurrent` itself (out of scope, pre-existing, used elsewhere) — adding the correctly-scoped query instead.

---

## Frontend (`apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx`)

New "Listing Plan" section, above or alongside the existing listings/leads sections:
- If `myBusinessSubscription` returns an active row: show plan name, amount, expiry date (display only — no countdown/urgency messaging, since nothing is enforced).
- If none: a "Subscribe" card with the plan's price/tagline and a buy button, reusing the exact same Razorpay-widget-open / PayU-redirect-submit pattern already in `CreditsTab.tsx`'s top-up flow (`activeGateway` query decides which).

---

## Explicitly Out of Scope

- Enforcement/deactivation on lapse (per your call — matches existing owner-plan behavior).
- Multiple tiers / featured / sponsored / portfolio-boost add-ons (per your call — PDF itself defers these).
- Per-listing billing (subscription is account-scoped).
- Fixing `subscriptions.myCurrent`'s type-blindness for its existing (seeker/owner) callers — flagged, not touched, since it's used elsewhere and out of this feature's blast radius.
- Grandfathering existing free listings — nothing to grandfather, since nothing is ever enforced.

---

## Files Touched Summary

| File | Change |
|---|---|
| `packages/trpc/src/sanitize.ts` | `planTypeSchema` gains `"designer"`, `"decor"` |
| `packages/trpc/src/routers/subscriptions.ts` | New `createBusinessOrder`, `createBusinessPayUOrder`, `verifyBusinessPayment`, `myBusinessSubscription` |
| `apps/web/src/app/api/payu/callback/route.ts` | **No changes** — existing `owner_subscription` branch is already generic |
| `apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx` | New "Listing Plan" section |
| Plan data | Two new DB rows created via the existing Plans Manager UI (admin action, not a code change) |

---

## Testing / Verification Plan

Live, browser-driven per this repo's convention (see memory `feedback_live_verification` for the session-bypass pattern that avoids rate limits and shared-DB pollution):
1. Create the two `Plan` rows (via a throwaway admin-portal action or direct Prisma insert for test purposes, cleaned up after).
2. As a throwaway designer-owning test user, open My Business, confirm the "Subscribe" card renders with the right price.
3. **Constraint to flag now, not solvable by verification alone:** completing a real Razorpay/PayU checkout requires configured gateway credentials (test or live) in the dev environment. If `.env.local` only has placeholder keys, `createBusinessOrder`/`createBusinessPayUOrder` will correctly throw `PRECONDITION_FAILED` (matching existing behavior for every other plan type) rather than complete a purchase — in that case, verification stops at "order creation is correctly gated / correctly rejected without configured keys" plus a direct-DB-inserted `Subscription` row to confirm `myBusinessSubscription` and the "active plan" UI display correctly, rather than a full real-money round-trip.
4. Clean up all test rows (`Plan`, `Subscription`, `Payment`, throwaway `User`) immediately after.
