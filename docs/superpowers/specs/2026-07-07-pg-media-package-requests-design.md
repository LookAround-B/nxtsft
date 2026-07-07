# NxtSft — PG Owner Media Package Requests (Lead Capture)
**Date:** 2026-07-07 | **Branch:** main | **Phase:** v1.0 demo

Sub-project 3 of 3 from the PG + Home Interiors gap analysis (`docs/NxtSft-PG & Home Interiors.pdf`; audit in memory `project_pg_interiors_audit`). Builds on nothing from sub-projects 1/2 directly — PG owners are already real logged-in `home-seller` users via `Property.ownerId`, so there's no account-linking gap to close here (unlike sub-project 1's Interior Designer/Decor Store gap).

---

## Scope

The spec describes NXTSFT acting as a "digital marketing partner" for PG owners, selling two packages:
- **Starter (₹2,000–4,500):** professional property photos, listing on NxtSft, complete property info, lead generation, social media promotion.
- **Premium (₹5,000–8,000):** everything in Starter, plus 360° virtual tour, cinematic walkthrough video, Instagram Reel creation (2–3 reels), professional thumbnail/cover images, featured placement, Instagram/social promotion, tagged collaboration posts.

**Key framing that shapes this design:** the actual deliverable is a real-world creative production service — a photographer/videographer visits the property, shoots and edits content, posts to Instagram. This can't be fulfilled by software alone, and per your call, v1 does **not** build a self-serve payment + fulfillment-tracking system for it. Instead this is a **lead-capture flow**: a PG owner requests a package, your team follows up offline to scope, schedule, and collect payment however you already do today. This is proportionate to a service you likely haven't built a scaled ops process for yet — building checkout+fulfillment tracking before that exists would be speculative engineering.

Also per your call: the entry point is a per-listing action in the existing "My Listings" tab (available any time after a PG listing is live), not the initial `/list` submission flow.

**Duplicate submissions are allowed, deliberately.** No dedup/cooldown check on `requestMediaPackage` — a PG owner could submit Starter twice, or Starter then Premium. Staff sees whatever lands in the Enquiries queue and handles it manually; adding submission-guard logic for a low-volume, staff-triaged lead form would be premature.

---

## Data Model

**No new tables.** Reuses the existing `Enquiry` model — mirroring the exact pattern `properties.reportIssue` and `interiorDesigners.reportIssue` already use: a source-tagged row with structured context folded into `message`, rather than a property-specific enquiry model.

`Enquiry.status` (`New` → `In Progress` → `Resolved` → `Closed`) doubles as the request pipeline for free: `New` = just submitted, `In Progress` = your team is scoping/scheduling/shooting, `Resolved` = content delivered, `Closed` = fully wrapped up. No new status vocabulary needed.

---

## Backend (`packages/trpc/src/routers/properties.ts`)

New procedure, inserted near `reportIssue` (same file, same style):

```ts
// PG owner requests a professional media package (Starter/Premium) — lead
// capture only, no payment here. Your team follows up offline to scope,
// schedule, and collect payment. Stored as an Enquiry, same pattern as
// reportIssue, so it shows up in the existing admin Enquiries queue.
requestMediaPackage: protectedProcedure
  .use(contactRateLimit)
  .input(
    z.object({
      propertyId: cuidSchema,
      packageType: z.enum(["starter", "premium"]),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, deletedAt: null },
      select: { id: true, title: true, slug: true, type: true, ownerId: true },
    });
    if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
    if (property.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (property.type !== "PG") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Media packages are only available for PG listings." });
    }

    const PACKAGE_LABEL: Record<typeof input.packageType, string> = {
      starter: "Starter Package (₹2,000–4,500)",
      premium: "Premium Package (₹5,000–8,000)",
    };

    await prisma.enquiry.create({
      data: {
        name: ctx.user.name,
        email: ctx.user.email,
        phone: ctx.user.phone,
        message: `[${PACKAGE_LABEL[input.packageType]}] requested for "${property.title}" (/properties/${property.slug}).`,
        source: "PG Media Package",
        status: "New",
      },
    });

    await notify({
      userId: ctx.user.id,
      type: "media_package_requested",
      title: "Media package request received",
      content: `We received your ${PACKAGE_LABEL[input.packageType]} request for "${property.title}". Our team will reach out shortly.`,
    });

    return { ok: true };
  }),
```

`notify` is already imported in this file (confirmed — used elsewhere in `properties.ts`); no new import needed. `contactRateLimit` is already imported and used by `reportIssue`/`unlockContact` in the same file.

---

## Frontend (`apps/web/src/components/user-portal/tabs/MyListingsTab.tsx`)

- A new "Get Professional Media" button, shown only when `p.type === "PG"` — note: the existing `ListingItem` type in this file does not currently include `type`; it needs to be added (property type is already selected server-side by `users.myListings`, this is a display-layer gap, not a backend one — verify during planning whether `users.myListings` already returns `type` and just isn't in the frontend type, or needs adding to the query's `select`).
- Clicking it opens a small modal with two side-by-side cards: Starter and Premium, each showing its price range and feature bullets (from the spec, hardcoded copy — no DB-backed pricing needed since these aren't purchasable amounts, just descriptive ranges pending your team's quote).
- Each card has a "Request This Package" button calling `trpc.properties.requestMediaPackage.mutate({ propertyId, packageType })`, followed by a success state ("Request submitted — our team will reach out shortly") and modal close.

---

## Admin Side

No new screen planned. Requests land in the existing `EnquiriesTab.tsx` (admin-portal) alongside all other enquiries, filterable/identifiable by `source: "PG Media Package"`. Verify during planning whether `EnquiriesTab.tsx` already surfaces `source` visibly (as a column or badge) — if not, add it (small, since the column likely already exists in the underlying data, just needs rendering). This is the same discovery step sub-project 2 needed for Plans Manager, done proactively here instead of found late in review.

---

## Explicitly Out of Scope

- Online payment for these packages (per your call — offline for now, matching how a bespoke, scheduled creative service is naturally sold before an ops process is proven).
- Automated fulfillment-status tracking beyond `Enquiry.status` — no new stage vocabulary, no dedicated dashboard.
- Any automatic `Property` field updates (`featured` toggle, `virtualTourUrl`, `walkthroughVideoUrl`) — your team sets these manually via existing admin edit tools once content is actually delivered. Building automation for a step that only happens after a real-world shoot would be speculative.
- Generalizing "media packages" to non-PG property types, or merging this with the existing (separate, pre-existing) "Boost" stub — these are different features that happen to look similar on the surface; Boost means visibility ranking, this means content production.

---

## Files Touched Summary

| File | Change |
|---|---|
| `packages/trpc/src/routers/properties.ts` | New `requestMediaPackage` procedure |
| `apps/web/src/components/user-portal/tabs/MyListingsTab.tsx` | New button + modal on PG listing cards; may need `type` added to the `ListingItem` frontend type/query select |
| `apps/web/src/components/admin-portal/tabs/EnquiriesTab.tsx` | Verify `source` is visible; add if not (small, TBD during planning) |

---

## Testing / Verification Plan

Live, per this repo's convention (session-bypass pattern from memory `feedback_live_verification`, throwaway test rows cleaned up immediately after):
1. As a throwaway home-seller test user who owns a PG-type property, open My Listings, confirm the "Get Professional Media" button appears only on the PG listing (not on a non-PG listing, if the test user has one).
2. Submit a Starter request, confirm an `Enquiry` row is created with the correct `source`/`message`/`status`, and a notification lands for the owner.
3. Confirm the request is visible in the admin Enquiries tab (as a staff user).
4. Confirm a non-PG property, or a property the test user doesn't own, correctly rejects the mutation (`BAD_REQUEST`/`FORBIDDEN`).
5. Clean up all test rows (`Property`, `Enquiry`, `Notification`, throwaway `User`, `Session`) immediately after.
