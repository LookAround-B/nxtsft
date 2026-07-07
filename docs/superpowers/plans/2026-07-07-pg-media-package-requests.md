# PG Owner Media Package Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a PG owner request a Starter or Premium professional-media package for their listing (lead capture only — no online payment), and let staff see the request in the existing Enquiries admin screen.

**Architecture:** One new tRPC mutation on the existing `properties` router that creates an `Enquiry` row, mirroring the file's existing `reportIssue` procedure exactly (same auth/validation shape, same "structured info folded into `message`" convention). A new button + modal in the seller's existing "My Listings" tab, shown only for PG-type listings. A small display-only addition to the existing admin Enquiries screen so these requests are distinguishable from general contact-form enquiries.

**Tech Stack:** Next.js 15, tRPC v11, Prisma 7 (Postgres), Zod, React (client components).

## Global Constraints

- **Lead capture only — no payment integration, no fulfillment-status automation.** Do not add any Razorpay/PayU code, do not add new `Enquiry` status values, do not add any `Property` field automation (`featured`, `virtualTourUrl`, `walkthroughVideoUrl`) — those stay manual admin actions outside this plan's scope.
- **Duplicate submissions are allowed, deliberately.** No dedup/cooldown check on the new mutation.
- **PG-only.** The mutation must reject non-PG properties (`property.type !== "PG"`); the frontend button must only render for PG-type listing cards.
- **This repo has no unit-test framework** (no jest/vitest, no `"test"` script) — verification is `tsc --noEmit` + `next lint` + `pnpm build` + live browser/API verification against the real dev server and shared VPS DB, using throwaway test rows deleted immediately after (session-bypass pattern documented in memory `feedback_live_verification`). Do not invent a test framework.
- **Never touch a real, non-demo user/property during verification.** Create fresh `Playwright <timestamp>` / `pw-*@example.com` throwaway rows and delete everything (`Property`, `Location`, `Enquiry`, `Notification`, `Session`, `User`) immediately after each task's verification step.

---

### Task 1: Backend — `requestMediaPackage` procedure

**Files:**
- Modify: `packages/trpc/src/routers/properties.ts` (insert new procedure after the existing `reportIssue` block, currently ending around line 283, and before the `get` procedure)

**Interfaces:**
- Consumes: `prisma.property`, `prisma.enquiry` (existing models), `notify` (already imported at the top of this file: `import { notify, notifyCredit } from "../notify";`), `contactRateLimit`/`cuidSchema` (already imported and already used by the adjacent `reportIssue`/`unlockContact` procedures in this same file).
- Produces: `requestMediaPackage({ propertyId: string, packageType: "starter" | "premium" }) → { ok: true }` — Task 2's frontend calls this by exact name.

- [ ] **Step 1: Add the procedure**

In `packages/trpc/src/routers/properties.ts`, find the end of the `reportIssue` procedure:

```ts
      await prisma.enquiry.create({
        data: {
          name: input.name || "Property Report",
          email: "report@nxtsft.local",
          phone: input.phone,
          message: `[${REASON_LABEL[input.reason]}] reported on "${property.title}" (/${property.slug}).${contact}`,
          source: "Report",
          status: "New",
        },
      });

      return { ok: true };
    }),

  // Single property by id or slug
  get: publicProcedure
```

Insert a new procedure between the `reportIssue` block's closing `}),` and the `// Single property by id or slug` comment:

```ts
      await prisma.enquiry.create({
        data: {
          name: input.name || "Property Report",
          email: "report@nxtsft.local",
          phone: input.phone,
          message: `[${REASON_LABEL[input.reason]}] reported on "${property.title}" (/${property.slug}).${contact}`,
          source: "Report",
          status: "New",
        },
      });

      return { ok: true };
    }),

  // PG owner requests a professional media package (Starter/Premium) — lead
  // capture only, no payment here. Staff follow up offline to scope, schedule,
  // and collect payment. Stored as an Enquiry, same pattern as reportIssue,
  // so it shows up in the existing admin Enquiries queue. Duplicate
  // submissions are allowed on purpose — no dedup check.
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

  // Single property by id or slug
  get: publicProcedure
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @nxtsft/web type-check`
Expected: no errors.

- [ ] **Step 3: Live verification**

Start the dev server:
```bash
(pnpm --filter @nxtsft/web dev > /tmp/dev.log 2>&1 &)
for i in $(seq 1 30); do grep -q "Ready in" /tmp/dev.log 2>/dev/null && break; sleep 1; done
grep "Local:" /tmp/dev.log
```

Using the session-bypass pattern (create a throwaway `User` + a `Property` with `type: "PG"` owned by that user + a `Session` row, POST the raw token to `/api/auth/session` to get a valid cookie, then call the new endpoint directly):

```ts
// Save as a temp .ts file, run with `pnpm exec tsx`
import crypto from "node:crypto";
import prisma from "./packages/db/client";

const BASE = "http://localhost:3000"; // adjust to whatever port `pnpm dev` printed

async function main() {
  const owner = await prisma.user.create({
    data: { email: `pw-media-${Date.now()}@example.com`, name: "Playwright Media Test", phone: "9" + String(Date.now()).slice(-9), role: "home-seller", city: "Mumbai" },
  });
  const property = await prisma.property.create({
    data: {
      title: `Playwright Test PG ${Date.now()}`,
      slug: `pw-test-pg-${Date.now()}`,
      type: "PG", purpose: "Rent", price: BigInt(10000), area: 150,
      ownerId: owner.id,
      location: { create: { city: "Mumbai", state: "Maharashtra", locality: "Test", latitude: 0, longitude: 0 } },
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.session.create({ data: { userId: owner.id, token: tokenHash, expiresAt: new Date(Date.now() + 3600_000) } });
  const sessionResp = await fetch(`${BASE}/api/auth/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: rawToken }) });
  const cookie = sessionResp.headers.get("set-cookie")?.split(";")[0];

  // 1. Valid PG request — should succeed
  const res1 = await fetch(`${BASE}/api/trpc/properties.requestMediaPackage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie ?? "" },
    body: JSON.stringify({ propertyId: property.id, packageType: "starter" }),
  });
  console.log("valid PG request status:", res1.status, await res1.text());

  // 2. Confirm the Enquiry row was created correctly
  const enquiry = await prisma.enquiry.findFirst({ where: { source: "PG Media Package", message: { contains: property.title } } });
  console.log("enquiry created:", !!enquiry, enquiry?.message);

  // 3. Non-PG property should be rejected
  const nonPg = await prisma.property.create({
    data: {
      title: `Playwright Test Apartment ${Date.now()}`,
      slug: `pw-test-apt-${Date.now()}`,
      type: "Apartment", purpose: "Sale", price: BigInt(1000000), area: 500,
      ownerId: owner.id,
      location: { create: { city: "Mumbai", state: "Maharashtra", locality: "Test", latitude: 0, longitude: 0 } },
    },
  });
  const res2 = await fetch(`${BASE}/api/trpc/properties.requestMediaPackage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie ?? "" },
    body: JSON.stringify({ propertyId: nonPg.id, packageType: "starter" }),
  });
  console.log("non-PG request status (expect 4xx/BAD_REQUEST):", res2.status, await res2.text());

  // Cleanup
  await prisma.enquiry.deleteMany({ where: { message: { contains: property.title } } });
  await prisma.notification.deleteMany({ where: { userId: owner.id } });
  await prisma.session.deleteMany({ where: { userId: owner.id } });
  await prisma.property.delete({ where: { id: property.id } });
  await prisma.property.delete({ where: { id: nonPg.id } });
  await prisma.user.delete({ where: { id: owner.id } });
  await prisma.$disconnect();
}
main();
```

Run: `pnpm exec tsx /tmp/verify_media_package.ts` (name the file whatever, delete it after)
Expected: request 1 returns 200 with `{"result":{"data":{"ok":true}}}`; the Enquiry is confirmed created with the right message; request 2 returns a 4xx/BAD_REQUEST error body. Then confirm cleanup ran (no leftover rows) and stop the dev server (`pkill -f "next dev"`).

- [ ] **Step 4: Commit**

```bash
git add packages/trpc/src/routers/properties.ts
git commit -m "feat(pg): add requestMediaPackage lead-capture procedure"
```

---

### Task 2: Frontend — "Get Professional Media" button + modal

**Files:**
- Modify: `apps/web/src/components/user-portal/tabs/MyListingsTab.tsx`

**Interfaces:**
- Consumes: `trpc.properties.requestMediaPackage` (from Task 1).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add `type` to the `ListingItem` type**

The backend (`users.myListings`, `packages/trpc/src/routers/users.ts:378-395`) uses Prisma's `include` (not `select`), which returns every scalar field of `Property` — including `type` — by default. No backend change is needed; only the frontend type is missing the field. In `apps/web/src/components/user-portal/tabs/MyListingsTab.tsx`, find:

```tsx
type ListingItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  views: number;
  price: number;
  bhk: string | null;
  images: string[];
  createdAt: string;
  location: { city: string; locality: string } | null;
  _count?: { leads: number; favoritedBy: number };
  hasPendingEdit?: boolean;
};
```

Add `type: string;` to it:

```tsx
type ListingItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  type: string;
  views: number;
  price: number;
  bhk: string | null;
  images: string[];
  createdAt: string;
  location: { city: string; locality: string } | null;
  _count?: { leads: number; favoritedBy: number };
  hasPendingEdit?: boolean;
};
```

- [ ] **Step 2: Add the imports and the `MediaPackageModal` component**

At the top of the file, add `Camera` to the existing lucide-react import list (currently `Building2, Eye, Clock, Pencil`):

```tsx
import { Building2, Eye, Clock, Pencil, Camera, Check } from "lucide-react";
```

Add this new component above the existing `ModifyConfirmDialog` function:

```tsx
const STARTER_FEATURES = [
  "Professional property photos",
  "Listing on NxtSft",
  "Complete property information",
  "Lead generation through the platform",
  "Social media promotion",
];

const PREMIUM_FEATURES = [
  ...STARTER_FEATURES,
  "360° Virtual Tour",
  "Cinematic walkthrough video",
  "Instagram Reel creation (2–3 reels)",
  "Professional thumbnail and cover images",
  "Featured placement on NxtSft",
  "Promotion on NxtSft's Instagram and other social platforms",
  "Tagged collaboration posts for increased reach",
];

function MediaPackageModal({
  propertyId,
  propertyTitle,
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState<"starter" | "premium" | null>(null);
  const requestPackage = trpc.properties.requestMediaPackage.useMutation({
    onError: (err) => toast.error(err.message || "Couldn't submit request."),
  });

  const request = (packageType: "starter" | "premium") => {
    requestPackage.mutate(
      { propertyId, packageType },
      { onSuccess: () => setSubmitted(packageType) },
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={22} />
            </div>
            <h3 className="text-base font-bold text-navy">Request submitted</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Our team will reach out shortly about your {submitted === "starter" ? "Starter" : "Premium"} package request for &quot;{propertyTitle}&quot;.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Get Professional Media</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team will reach out to schedule the shoot and quote final pricing.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <div className="text-sm font-bold text-navy">Starter Package</div>
                <div className="mt-1 text-xs font-semibold text-accent">₹2,000–4,500</div>
                <ul className="mt-3 space-y-1.5">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => request("starter")}
                  disabled={requestPackage.isPending}
                  className="mt-4 w-full rounded-md border border-border px-3 py-2 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Request This Package
                </button>
              </div>

              <div className="rounded-xl border-2 border-accent p-4">
                <div className="text-sm font-bold text-navy">Premium Package</div>
                <div className="mt-1 text-xs font-semibold text-accent">₹5,000–8,000</div>
                <ul className="mt-3 space-y-1.5">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => request("premium")}
                  disabled={requestPackage.isPending}
                  className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
                >
                  Request This Package
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the modal state and the new button into the component**

Find the existing state declaration inside `export function MyListingsTab()`:

```tsx
  const [modifyTarget, setModifyTarget] = useState<string | null>(null);
```

Add a new state variable right after it:

```tsx
  const [modifyTarget, setModifyTarget] = useState<string | null>(null);
  const [mediaPackageTarget, setMediaPackageTarget] = useState<{ id: string; title: string } | null>(null);
```

Find the existing modal render at the top of the JSX return:

```tsx
      {modifyTarget && (
        <ModifyConfirmDialog
          onClose={() => setModifyTarget(null)}
          onConfirm={() => router.push(`/list/edit/${modifyTarget}`)}
        />
      )}
```

Add the new modal's render right after it:

```tsx
      {modifyTarget && (
        <ModifyConfirmDialog
          onClose={() => setModifyTarget(null)}
          onConfirm={() => router.push(`/list/edit/${modifyTarget}`)}
        />
      )}
      {mediaPackageTarget && (
        <MediaPackageModal
          propertyId={mediaPackageTarget.id}
          propertyTitle={mediaPackageTarget.title}
          onClose={() => setMediaPackageTarget(null)}
        />
      )}
```

Find the action-buttons row inside the `.map((p) => {...})` block (currently starts with the "Boost" button):

```tsx
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => toast("Boost is a paid upgrade — coming soon")}
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                      >
                        Boost
                      </button>
```

Insert the new button immediately after the Boost button (only rendered for PG-type listings):

```tsx
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => toast("Boost is a paid upgrade — coming soon")}
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                      >
                        Boost
                      </button>
                      {p.type === "PG" && (
                        <button
                          onClick={() => setMediaPackageTarget({ id: p.id, title: p.title })}
                          className="inline-flex items-center gap-1 rounded-md border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/5"
                        >
                          <Camera size={11} /> Get Professional Media
                        </button>
                      )}
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm --filter @nxtsft/web type-check`
Expected: no errors.

Run: `pnpm --filter @nxtsft/web lint`
Expected: no new warnings beyond the single pre-existing one in `ReviewsTab.tsx`.

- [ ] **Step 5: Production build**

Run: `pnpm --filter @nxtsft/web build`
Expected: succeeds, zero route errors.

- [ ] **Step 6: Live browser verification**

Using the session-bypass pattern (a throwaway `User` with a PG-type `Property` they own, a `Session`, and the matching `localStorage["nxtsft.session"]` entry seeded via `page.evaluate()` — see memory `feedback_live_verification` for the full pattern, or Task 1's verification script for the session-establishment code to adapt), drive a real Playwright browser to `/user-portal#mylist` and confirm:
1. The "Get Professional Media" button appears on the PG listing card, next to "Boost".
2. Clicking it opens the modal showing both packages with their correct price ranges and feature lists.
3. Clicking "Request This Package" on Starter shows the success state ("Request submitted...").
4. If the test user also has a non-PG property, confirm the button does NOT appear on that listing's card.

Delete all test rows (`Property`, `Location`, `Enquiry`, `Notification`, `Session`, `User`) immediately after.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/user-portal/tabs/MyListingsTab.tsx
git commit -m "feat(pg): add media package request button and modal to My Listings"
```

---

### Task 3: Admin — surface `source` in the Enquiries screen

**Files:**
- Modify: `apps/web/src/components/admin-portal/tabs/EnquiriesTab.tsx`

**Interfaces:**
- Consumes: `trpc.contact.list` (existing, unchanged — already returns `source` on every row via Prisma's default `include`-based field selection, confirmed in `packages/trpc/src/routers/contact.ts:57-70`; only the frontend type/rendering is missing it).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add `source` to the `Enquiry` type**

In `apps/web/src/components/admin-portal/tabs/EnquiriesTab.tsx`, find:

```tsx
type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string;
  status: string;
  createdAt: string | Date;
};
```

Add `source: string;`:

```tsx
type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string;
  status: string;
  source: string;
  createdAt: string | Date;
};
```

- [ ] **Step 2: Add a "Source" column to the table**

Find the table header row:

```tsx
              <thead>
                <tr>
                  <th className="py-2">Received</th>
                  <th>From</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Set status</th>
                  <th>View</th>
                </tr>
              </thead>
```

Add a "Source" header after "From":

```tsx
              <thead>
                <tr>
                  <th className="py-2">Received</th>
                  <th>From</th>
                  <th>Source</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Set status</th>
                  <th>View</th>
                </tr>
              </thead>
```

Find the corresponding body cell for "From" (the `<td>` immediately after the "Received" `<td>`):

```tsx
                    <td>
                      <div className="font-semibold text-navy">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                    </td>
                    <td className="text-xs">{e.phone ?? "—"}</td>
```

Insert a new `<td>` for source between them:

```tsx
                    <td>
                      <div className="font-semibold text-navy">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                    </td>
                    <td>
                      <Badge tone={e.source === "PG Media Package" ? "hot" : "default"}>{e.source}</Badge>
                    </td>
                    <td className="text-xs">{e.phone ?? "—"}</td>
```

- [ ] **Step 3: Show source in the detail modal**

Find the modal's subtitle line:

```tsx
          <div>
            <h2 className="text-base font-bold text-navy">{enquiry.name}</h2>
            <p className="text-xs text-muted-foreground">Contact enquiry</p>
          </div>
```

Change the static "Contact enquiry" subtitle to show the actual source:

```tsx
          <div>
            <h2 className="text-base font-bold text-navy">{enquiry.name}</h2>
            <p className="text-xs text-muted-foreground">{enquiry.source}</p>
          </div>
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm --filter @nxtsft/web type-check`
Expected: no errors.

Run: `pnpm --filter @nxtsft/web lint`
Expected: no new warnings beyond the single pre-existing one in `ReviewsTab.tsx`.

- [ ] **Step 5: Production build**

Run: `pnpm --filter @nxtsft/web build`
Expected: succeeds, zero route errors.

- [ ] **Step 6: Live browser verification**

Using the session-bypass pattern, log in as a staff account (e.g. an admin demo user from `packages/db/prisma/seed.ts`), navigate to the admin portal's Enquiries tab, and confirm the "Source" column renders for existing enquiries (e.g. "Website", "Report" if any exist), and that submitting a test media-package request (reusing Task 1's verification setup, or creating one directly via Prisma with `source: "PG Media Package"`) shows it with the distinct "hot"-toned badge. Clean up any test `Enquiry` rows created for this check.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin-portal/tabs/EnquiriesTab.tsx
git commit -m "feat(pg): surface enquiry source in admin Enquiries screen"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Backend lead-capture procedure (Task 1) ✓, PG-only entry point in My Listings (Task 2) ✓, admin visibility via existing Enquiries screen (Task 3) ✓. Out-of-scope items (payment, fulfillment automation, Property field automation, dedup) not implemented anywhere in this plan ✓.
- **No placeholders:** every step has complete, copy-pasteable code or exact commands.
- **Type consistency:** `requestMediaPackage({ propertyId, packageType })` in Task 1 matches exactly what Task 2's `MediaPackageModal` calls (`trpc.properties.requestMediaPackage.useMutation()` with `{ propertyId, packageType }`). `ListingItem.type` (Task 2, Step 1) matches the `p.type === "PG"` check used in Task 2, Step 3. `Enquiry.source` (Task 3, Step 1) matches its use in Task 3, Steps 2–3.
