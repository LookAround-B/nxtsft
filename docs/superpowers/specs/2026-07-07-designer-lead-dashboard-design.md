# NxtSft — Designer/Decor Account Linking + Lead Dashboard (+ PG Owner Unlock Visibility)
**Date:** 2026-07-07 | **Branch:** main | **Phase:** v1.0 demo

Sub-project 1 of 3 from the PG + Home Interiors business-spec gap analysis (`docs/NxtSft-PG & Home Interiors.pdf`; audit recorded in memory `project_pg_interiors_audit`). Sub-projects 2 (designer subscription billing) and 3 (PG owner media packages) are separate specs, built after this one lands.

---

## Scope

Interior Designers and Decor Stores are directory-only entities today — `InteriorDesigner`/`DecorStore` have zero link to a `User` row, even though `interiorDesigners.submit`/`decorStores.submit` already require a signed-in user to call them and then discard `ctx.user.id`. The result: contact-unlock events ("leads") are recorded but invisible to the business itself, only visible to NXTSFT admin.

Property/PG owners (`home-seller` role) already have partial visibility via `users.sellerLeads` (formal buyer inquiries), but not the raw "someone unlocked your contact" signal — the smaller, analogous gap on that side.

No new `User.role` value, no new login flow, no new portal shell. Whoever already submitted the listing gets linked automatically; portal visibility is gated on **data ownership** (does a linked row exist), the same way `isSeller` today gates on role — just one more conditional source.

Three areas, same shape:
1. Interior Designer account linking + lead dashboard
2. Decor Store account linking + lead dashboard (mirrors #1 exactly)
3. Home-seller / PG owner unlock visibility (`sellerUnlocks`)

Plus: owner-facing notifications on all three unlock paths, reusing the existing `Notification` model/bell.

---

## 1. Interior Designer — Account Linking + Lead Dashboard

### Schema (`packages/db/prisma/schema.prisma`)
```prisma
model InteriorDesigner {
  // ...existing fields...
  userId String?
  user   User?   @relation("UserOwnedInteriorDesigners", fields: [userId], references: [id])
  // ...
  @@index([userId])
}
```
Add to `User`: `ownedInteriorDesigners InteriorDesigner[] @relation("UserOwnedInteriorDesigners")`

**Not unique** — a user may submit more than one design company over time (e.g. running studios in two cities); `myProfiles`/`myLeads` aggregate across every row they own rather than assuming exactly one.

### tRPC (`packages/trpc/src/routers/interiorDesigners.ts`)
- `submit` — add `userId: ctx.user.id` to the `prisma.interiorDesigner.create` call (currently omitted).
- New `myProfiles` (protectedProcedure) — `findMany({ where: { userId: ctx.user.id } })`, includes private `phone`/`email` since it's the caller's own data. Returns `[]` for anyone who owns nothing (cheap, safe to call unconditionally from the portal).
- New `myLeads` (protectedProcedure) — for all designer ids owned by `ctx.user.id`: query `InteriorDesignerView` where `contactUnlocked: true`, cross-reference `CreditTransaction` (`reason: "designer_contact_unlock"`, matching `interiorDesignerId`) to resolve the buyer's identity + exact timestamp (mirrors the batch-resolve pattern already used in `properties.engagement`). Returns buyer name, phone, email, buyer's `city` (the closest available proxy for the spec's "property location, if shared" — designers don't have a per-lead location field), and unlock timestamp, plus which of the caller's listings it was against.
- `unlockContact` — after a successful unlock, if the target designer has a `userId`, call the shared `notify()` helper: `type: "designer_lead"`, title `"New lead on {companyName}"`, `actionUrl: "/user-portal#business"`.

### Frontend
- New `MyBusinessTab.tsx` (`apps/web/src/components/user-portal/tabs/`) — one tab covering both Interior Designer and Decor Store ownership (a user could in principle own either or both). Renders: a summary card per owned listing (name, views, contacts, verified badge) + a combined, timestamp-sorted leads table (buyer name / phone / email / city / which listing / when).
- `apps/web/src/app/user-portal/page.tsx` — fetch `interiorDesigners.myProfiles` and `decorStores.myProfiles` at the top of `UserPortal`; if either returns a non-empty array, splice in a `{ label: "My Business", to: "/user-portal#business", icon: <Briefcase size={14} /> }` nav item, same conditional-spread pattern already used for `isSeller`'s Leads/Visits items. (The tab will pop in once the query resolves, same lazy-visibility behavior the rest of the portal already has — not a regression.)

---

## 2. Decor Store — mirrors Interior Designer exactly

Same shape, `DecorStore` model, `packages/trpc/src/routers/decorStores.ts`:
- Schema: `DecorStore.userId` (+ `User.ownedDecorStores DecorStore[]`, indexed, not unique).
- `submit` sets `userId: ctx.user.id`.
- New `myProfiles`, `myLeads` (via `DecorStoreView` + `CreditTransaction` reason `"decor_contact_unlock"`).
- `unlockContact` notifies the owner (`type: "decor_lead"`).
- Frontend: folded into the same `MyBusinessTab.tsx` as Interior Designer (see above) rather than a second tab — one "My Business" surface, sectioned by listing.

---

## 3. Home-Seller / PG Owner — Unlock Visibility

### tRPC (`packages/trpc/src/routers/users.ts`)
New `sellerUnlocks` (protectedProcedure) — mirrors the existing `sellerLeads` procedure exactly: look up the caller's own property ids, then `prisma.propertyView.findMany({ where: { propertyId: { in }, contactUnlocked: true } })`, cross-referenced with `CreditTransaction` (`reason: "contact_unlock"`) the same way `properties.engagement` already batch-resolves buyer names from `CreditTransaction.userId`. Returns buyer name, unlock timestamp, and which property.

### `packages/trpc/src/routers/properties.ts`
`unlockContact` — currently calls `notifyCredit()` for the **buyer** only. Add a second `notify()` call to `property.ownerId`: `type: "property_lead"`, title `"New lead on {property.title}"`.

### Frontend
Extend `SellerLeadsTab.tsx` with a small "Contact Unlocks" section reading `users.sellerUnlocks`, alongside the existing formal-lead table it already renders.

---

## Notifications

All three unlock paths (`properties.unlockContact`, `interiorDesigners.unlockContact`, `decorStores.unlockContact`) gain one extra `notify()` call to the owner/`userId` when one exists. Reuses the existing `Notification` model and `NotificationBell` component already wired into `PortalShell` — no new infrastructure, no schema change beyond what's listed above.

---

## Explicitly Out of Scope (deferred, by design)

- **Linking existing admin-added/bulk-imported designers or decor stores** to a user account — there's no submitter to link to. A future admin "assign owner" action (search a user, set `userId` on an existing row) is a natural small follow-up, not part of this pass.
- **Deduplicating repeated unlocks** by the same buyer (each unlock creates its own lead row + notification) — matches the existing behavior of all three unlock flows today; not a regression introduced here.
- Designer subscription billing and PG owner media packages — separate specs (sub-projects 2 and 3).

---

## Files Touched Summary

| File | Change |
|---|---|
| `packages/db/prisma/schema.prisma` | `InteriorDesigner.userId`, `DecorStore.userId` (+ relations, indexes on both) |
| `packages/trpc/src/routers/interiorDesigners.ts` | `submit` sets `userId`; new `myProfiles`, `myLeads`; `unlockContact` notifies owner |
| `packages/trpc/src/routers/decorStores.ts` | Same three changes, mirrored |
| `packages/trpc/src/routers/properties.ts` | `unlockContact` notifies `property.ownerId` |
| `packages/trpc/src/routers/users.ts` | New `sellerUnlocks` |
| `apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx` | New — combined designer/decor dashboard |
| `apps/web/src/components/user-portal/tabs/SellerLeadsTab.tsx` | Add Contact Unlocks section |
| `apps/web/src/app/user-portal/page.tsx` | Conditional "My Business" nav item + route case |

---

## DB Push Checklist

Additive only — two nullable FK columns + two indexes on existing tables, no drops, no data migration required. Safe to `prisma db push` to the shared VPS DB per the existing "no migrations folder, additive-only" convention (see memory `project-database`).

---

## Testing / Verification Plan

Live, browser-driven against the real dev server + shared VPS DB (per this repo's verification convention — no mocking):
1. As User A, submit a new Interior Designer listing → confirm `InteriorDesigner.userId` is set and the "My Business" tab appears in User A's portal (initially with 0 leads).
2. As User B, unlock User A's designer's contact → confirm a lead row appears in User A's dashboard (buyer name/phone/email/city/timestamp) and a notification lands in User A's bell.
3. Repeat steps 1–2 for a Decor Store.
4. As a home-seller who owns a PG (or any) listing, confirm `sellerUnlocks` surfaces a buyer's contact-unlock event in the existing Leads tab, and that a notification lands for the property owner.
5. Regression check: an existing admin-added designer/decor store (no `userId`) still renders correctly on the public directory and doesn't crash `myProfiles`/`myLeads` for unrelated users (should simply not appear in anyone's dashboard).
6. `tsc --noEmit`, `next lint`, `pnpm --filter @nxtsft/web build` all clean.
