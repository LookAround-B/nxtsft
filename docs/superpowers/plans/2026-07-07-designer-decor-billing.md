# Designer/Decor Monthly Listing Plan Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Interior Designers and Decor Stores buy a flat monthly listing plan (Razorpay or PayU), tracked the same way owner-rent/sell subscriptions already are — revenue-tracking only, no enforcement.

**Architecture:** Extend the existing `Plan`/`Subscription`/`Payment` billing system (already proven for seeker credit plans and owner-rent/sell subscriptions) with two new DB-backed `Plan` rows (`type: "designer"` / `"decor"`) and three new tRPC procedures on `subscriptions.ts` that mirror the existing `createOwnerOrder`/`createOwnerPayUOrder`/`verifyOwnerPayment` almost line-for-line, but source the plan from the DB instead of a hardcoded array. A new type-scoped read query (`myBusinessSubscription`) and a "Listing Plan" section in `MyBusinessTab.tsx` (reusing `CreditsTab.tsx`'s exact checkout-widget pattern) complete the loop.

**Tech Stack:** Next.js 15, tRPC v11, Prisma 7 (Postgres), Zod, Razorpay/PayU checkout SDKs (already integrated).

## Global Constraints

- **Track only, no enforcement** — a lapsed or never-purchased designer/decor listing stays live. Do not add any deactivation, grace-period, or gating logic anywhere in this plan.
- **One flat plan per vertical** — no tiers, no featured/sponsored add-ons. Exactly two new `Plan` rows total.
- **Billing is account-scoped, not listing-scoped** — a `Subscription` row belongs to a `User`, not to a specific `InteriorDesigner`/`DecorStore` row. Do not add a listing FK to `Subscription`.
- **This repo has no unit-test framework** (`grep` confirms no jest/vitest/`"test"` script anywhere) — this project's actual verification convention is `tsc --noEmit` + `next lint` + `pnpm build`, plus live browser/API verification against the real dev server and shared VPS DB (session-bypass pattern documented in memory `feedback_live_verification`, avoiding rate limits and never touching real non-demo accounts). Every task below uses that convention instead of fabricated unit tests — do not invent a test framework.
- **Never touch a real, non-demo user or property/listing during verification.** Create fresh `Playwright <timestamp>` / `pw-*@example.com`-style throwaway rows and delete every one (including `Session`/`Payment`/`Subscription`/`Notification` rows) immediately after each task's verification step.
- The PayU callback route (`apps/web/src/app/api/payu/callback/route.ts`) needs **zero changes** — do not touch it. Its existing `meta.type === "owner_subscription"` branch is already generic.

---

### Task 1: Add `"designer"`/`"decor"` to the plan type enum

**Files:**
- Modify: `packages/trpc/src/sanitize.ts:242`

**Interfaces:**
- Produces: `planTypeSchema` now accepts `"designer"` and `"decor"` in addition to the existing three values — every later task's Zod input validation relies on this.

- [ ] **Step 1: Make the change**

In `packages/trpc/src/sanitize.ts`, find:

```ts
export const planTypeSchema = z.enum(["seeker", "owner-rent", "owner-sell"]);
```

Replace with:

```ts
export const planTypeSchema = z.enum(["seeker", "owner-rent", "owner-sell", "designer", "decor"]);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @nxtsft/web type-check`
Expected: no errors (this is a pure enum widening; nothing currently narrows on the old set in a way that would break).

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/sanitize.ts
git commit -m "feat(billing): add designer/decor to planTypeSchema"
```

---

### Task 2: Seed the two new `Plan` rows

**Files:**
- Modify: `packages/db/prisma/seed.ts` (near the existing `ownerRentPlans`/`ownerSellPlans`/`allPlans` block, currently around line 52–113)

**Interfaces:**
- Consumes: nothing new (uses `prisma.plan.upsert`, already imported/used in this file).
- Produces: two DB rows the later tasks query by id: `designer-monthly` (`type: "designer"`) and `decor-monthly` (`type: "decor"`). Task 3's procedures look these up via `prisma.plan.findUnique`/`findMany({ where: { type } })`, not by hardcoded id, so the exact id strings only matter for this task's own idempotency.

- [ ] **Step 1: Add the two plan definitions**

In `packages/db/prisma/seed.ts`, find the existing block:

```ts
  const ownerSellPlans = ownerRentPlans.map((p) => ({
    ...p,
    id: p.id.replace("owner-rent", "owner-sell"),
    type: "owner-sell",
  }));

  const allPlans = [...seekerPlans, ...ownerRentPlans, ...ownerSellPlans];
```

Replace with:

```ts
  const ownerSellPlans = ownerRentPlans.map((p) => ({
    ...p,
    id: p.id.replace("owner-rent", "owner-sell"),
    type: "owner-sell",
  }));

  const businessPlans = [
    {
      id: "designer-monthly",
      name: "Business Listing",
      price: 499,
      priceLabel: "₹499",
      credits: 0,
      validity: 30,
      tagline: "Stay listed on the Home Interiors directory",
      features: ["Live directory listing", "Buyer leads via contact unlock", "30-day validity"],
      popular: false,
      type: "designer",
    },
    {
      id: "decor-monthly",
      name: "Business Listing",
      price: 499,
      priceLabel: "₹499",
      credits: 0,
      validity: 30,
      tagline: "Stay listed on the Decor Stores directory",
      features: ["Live directory listing", "Buyer leads via contact unlock", "30-day validity"],
      popular: false,
      type: "decor",
    },
  ];

  const allPlans = [...seekerPlans, ...ownerRentPlans, ...ownerSellPlans, ...businessPlans];
```

- [ ] **Step 2: Run the seed script**

Run: `pnpm --filter @nxtsft/db db:seed`
Expected output includes: `✓ Seeded 15 plans` (13 previously-existing + 2 new — check the actual prior count in your run's output and confirm it went up by exactly 2). The script is idempotent (`upsert`), safe to run against the shared VPS DB per this repo's established seeding convention.

- [ ] **Step 3: Verify the rows exist**

```bash
cat > /tmp/verify_plans.mjs << 'EOF'
import prisma from "./packages/db/client.ts";
const rows = await prisma.plan.findMany({ where: { type: { in: ["designer", "decor"] } } });
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
EOF
pnpm exec tsx /tmp/verify_plans.mjs
rm -f /tmp/verify_plans.mjs
```

Expected: two rows printed, `designer-monthly` (type `"designer"`, price `499`) and `decor-monthly` (type `"decor"`, price `499`).

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(billing): seed designer/decor monthly listing plans"
```

---

### Task 3: Backend — business plan checkout procedures

**Files:**
- Modify: `packages/trpc/src/routers/subscriptions.ts` (add new procedures inside `subscriptionsRouter`, alongside the existing `createOwnerOrder`/`createOwnerPayUOrder`/`verifyOwnerPayment`/`myCurrent` — insert after `verifyOwnerPayment`, i.e. after line 484 in the current file, before `myCurrent`)

**Interfaces:**
- Consumes: `prisma.plan` (existing model), `prisma.subscription`/`prisma.payment` (existing models), `generatePayUHash`/`PAYU_BASE_URL` (already imported in this file from `../payu`), `planTypeSchema` (from Task 1).
- Produces: four new procedures Task 4's frontend consumes directly by name:
  - `createBusinessOrder({ planId: string }) → { orderId, amount, currency, planId, planName, keyId, prefill: { name, email, contact } }`
  - `createBusinessPayUOrder({ planId: string }) → { action, key, txnid, amount, productinfo, firstname, lastname, email, phone, udf1, udf2, surl, furl, hash }`
  - `verifyBusinessPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature, planId }) → { ok: true, planName: string, endDate: Date }`
  - `myBusinessSubscription() → (Subscription & { amount: number }) | null`

- [ ] **Step 1: Add the four procedures**

In `packages/trpc/src/routers/subscriptions.ts`, immediately after the closing `}),` of `verifyOwnerPayment` (the block ending `return { ok: true, planName: plan.name, endDate };\n    }),` around line 483–484) and before the `// Active subscription for current user` / `myCurrent` block, insert:

```ts
  // Create a Razorpay order for a designer/decor "Business Listing" plan.
  // Same shape as createOwnerOrder, but sourced from the DB Plan table
  // (not a hardcoded array) so pricing changes don't need a deploy.
  createBusinessOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || (plan.type !== "designer" && plan.type !== "decor")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Razorpay not configured." });
      }

      const receipt = `nxtsft_biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100,
          currency: "INR",
          receipt,
          notes: { userId: ctx.user.id, planId: input.planId, type: "owner_subscription" },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { description?: string } };
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.error?.description ?? "Failed to create Razorpay order.",
        });
      }

      const order = await res.json() as { id: string; amount: number; currency: string };

      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100),
          status: "Pending",
          method: "Razorpay",
          gateway: "razorpay",
          razorpayOrderId: order.id,
          description: `${plan.name} subscription`,
          metadata: { planId: input.planId, type: "owner_subscription" },
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        planId: input.planId,
        planName: plan.name,
        keyId,
        prefill: { name: ctx.user.name, email: ctx.user.email, contact: ctx.user.phone ?? "" },
      };
    }),

  // Create a PayU order for a designer/decor plan (redirect flow). Sets the
  // SAME "owner_subscription" metadata marker the PayU callback route already
  // branches on generically — the callback route needs no changes.
  createBusinessPayUOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || (plan.type !== "designer" && plan.type !== "decor")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      }

      if (!process.env.PAYU_MERCHANT_KEY || !process.env.PAYU_MERCHANT_SALT) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PayU not configured." });
      }

      const txnid = `nxtsft_biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const amount = plan.price.toFixed(2);
      const productinfo = `NxtSft ${plan.name}`;
      const firstname = ctx.user.name.split(" ")[0] || ctx.user.name;
      const email = ctx.user.email;
      const phone = ctx.user.phone ?? "9999999999";
      const udf1 = ctx.user.id;
      const udf2 = input.planId;

      const hash = generatePayUHash({ txnid, amount, productinfo, firstname, email, udf1, udf2 });

      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100),
          status: "Pending",
          method: "PayU",
          gateway: "payu",
          payuTxnId: txnid,
          description: `${plan.name} subscription`,
          metadata: { planId: input.planId, type: "owner_subscription", validityDays: plan.validity, planName: plan.name, cycle: "monthly" },
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nxtsft.com";

      return {
        action: PAYU_BASE_URL,
        key: process.env.PAYU_MERCHANT_KEY,
        txnid, amount, productinfo, firstname,
        lastname: "",
        email, phone, udf1, udf2,
        surl: `${baseUrl}/api/payu/callback`,
        furl: `${baseUrl}/api/payu/callback`,
        hash,
      };
    }),

  // Verify Razorpay payment for a designer/decor plan and activate the
  // subscription. Mirrors verifyOwnerPayment; DB-plan-sourced instead of
  // OWNER_PLANS-sourced, and always monthly (this vertical has one flat
  // plan, no weekly/tiered cycles).
  verifyBusinessPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: safeString(200, 1),
        razorpayPaymentId: safeString(200, 1),
        razorpaySignature: safeString(200, 1),
        planId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (secret) {
        const expected = createHmac("sha256", secret)
          .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
          .digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(input.razorpaySignature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed." });
        }
      } else if (process.env.NODE_ENV === "production") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment gateway not configured." });
      }

      const existingPayment = await prisma.payment.findFirst({
        where: { razorpayId: input.razorpayPaymentId },
      });
      if (existingPayment) {
        throw new TRPCError({ code: "CONFLICT", message: "Payment already processed." });
      }

      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || (plan.type !== "designer" && plan.type !== "decor")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + plan.validity);

      await Promise.all([
        prisma.subscription.create({
          data: {
            userId: ctx.user.id,
            planId: input.planId,
            planName: plan.name,
            amount: BigInt(plan.price * 100),
            status: "Active",
            cycle: "monthly",
            razorpayId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            startDate: now,
            endDate,
          },
        }),
        prisma.payment.upsert({
          where: { razorpayOrderId: input.razorpayOrderId },
          update: { status: "Success", razorpayId: input.razorpayPaymentId },
          create: {
            userId: ctx.user.id,
            amount: BigInt(plan.price * 100),
            status: "Success",
            method: "Razorpay",
            gateway: "razorpay",
            razorpayId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            description: `${plan.name} subscription`,
          },
        }),
      ]);

      return { ok: true, planName: plan.name, endDate };
    }),

  // Type-scoped current-subscription lookup for the "My Business" tab.
  // Unlike myCurrent (which returns whichever Subscription is most recently
  // created regardless of type — wrong for a user who's both a buyer and a
  // business owner), this filters to designer/decor plan ids specifically.
  myBusinessSubscription: protectedProcedure.query(async ({ ctx }) => {
    const businessPlans = await prisma.plan.findMany({
      where: { type: { in: ["designer", "decor"] } },
      select: { id: true },
    });
    if (businessPlans.length === 0) return null;

    const sub = await prisma.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        status: "Active",
        planId: { in: businessPlans.map((p) => p.id) },
      },
      orderBy: { createdAt: "desc" },
    });
    return sub ? { ...sub, amount: Number(sub.amount) } : null;
  }),

```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @nxtsft/web type-check`
Expected: no errors.

- [ ] **Step 3: Live verification — order creation is correctly gated without configured gateway keys**

This mirrors how every other plan type behaves when Razorpay/PayU env keys aren't set — confirms the guard works before testing anything requiring real keys.

```bash
(pnpm --filter @nxtsft/web dev > /tmp/dev.log 2>&1 &)
for i in $(seq 1 30); do grep -q "Ready in" /tmp/dev.log 2>/dev/null && break; sleep 1; done
```

Then create a throwaway session and call the new procedure directly (adapting the pattern in memory `feedback_live_verification`: create a `User` + `Session` row, POST the raw token to `/api/auth/session`, then call the tRPC endpoint with the resulting cookie). Save as `/tmp/verify_business_order.ts`:

```ts
import crypto from "node:crypto";
import prisma from "./packages/db/client";

const BASE = "http://localhost:3000"; // adjust to whatever port `pnpm dev` printed

async function main() {
  const user = await prisma.user.create({
    data: { email: `pw-billing-${Date.now()}@example.com`, name: "Playwright Billing Test", phone: "9" + String(Date.now()).slice(-9), role: "user", city: "Mumbai" },
  });
  const plan = await prisma.plan.findFirstOrThrow({ where: { type: "designer" } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.session.create({ data: { userId: user.id, token: tokenHash, expiresAt: new Date(Date.now() + 3600_000) } });
  const sessionResp = await fetch(`${BASE}/api/auth/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: rawToken }) });
  const cookie = sessionResp.headers.get("set-cookie")?.split(";")[0];

  const res = await fetch(`${BASE}/api/trpc/subscriptions.createBusinessOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie ?? "" },
    body: JSON.stringify({ planId: plan.id }),
  });
  console.log("status:", res.status);
  console.log("body:", await res.text());

  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}
main();
```

Run: `pnpm exec tsx /tmp/verify_business_order.ts`
Expected: `status: 200` with either a real Razorpay order body (if `.env.local` has real/test keys) **or** a `PRECONDITION_FAILED` / "Razorpay not configured" error body if it doesn't — either is correct behavior; a 500 or an unhandled crash is not. Delete `/tmp/verify_business_order.ts` after.

- [ ] **Step 4: Live verification — `myBusinessSubscription` returns null with no subscription, and the right row once one exists**

Extend the same throwaway user from Step 3 (recreate it): call `myBusinessSubscription` before any `Subscription` row exists (expect `null`), then insert a `Subscription` row directly via Prisma (`planId` pointing at the seeded `designer-monthly` plan, `status: "Active"`), call it again (expect that row back, `amount` as a plain number not BigInt), then delete the `Subscription` and the throwaway user.

- [ ] **Step 5: Stop the dev server and confirm no leftover test data**

```bash
pkill -f "next dev"
cat > /tmp/final_check.mjs << 'EOF'
import prisma from "./packages/db/client.ts";
const users = await prisma.user.count({ where: { email: { contains: "pw-billing-" } } });
console.log("leftover test users:", users);
await prisma.$disconnect();
EOF
pnpm exec tsx /tmp/final_check.mjs
rm -f /tmp/final_check.mjs
```
Expected: `leftover test users: 0`.

- [ ] **Step 6: Commit**

```bash
git add packages/trpc/src/routers/subscriptions.ts
git commit -m "feat(billing): add designer/decor plan checkout + myBusinessSubscription"
```

---

### Task 4: Frontend — "Listing Plan" section in My Business

**Files:**
- Modify: `apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx`

**Interfaces:**
- Consumes: `trpc.subscriptions.myBusinessSubscription`, `trpc.subscriptions.activeGateway`, `trpc.subscriptions.createBusinessOrder`, `trpc.subscriptions.createBusinessPayUOrder`, `trpc.subscriptions.verifyBusinessPayment` (all from Task 3), `trpc.subscriptions.plans({ type: "designer" | "decor" })` (existing, unchanged), `openRazorpayCheckout` from `@/lib/razorpay` (existing, unchanged, same import already used in `CreditsTab.tsx`).
- Produces: nothing consumed elsewhere — this is the final, user-visible task.

- [ ] **Step 1: Add imports and the checkout handler**

In `apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx`, update the top imports:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Briefcase, Eye, Phone, Mail, MapPin, Sofa, ShieldCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { Head, fmtDate } from "./shared";
```

Add a `PlanListing` type near the other type definitions:

```tsx
type PlanListing = { id: string; name: string; price: number; priceLabel: string; tagline: string; features: string[] };
type CurrentBusinessSub = { id: string; planName: string; amount: number; endDate: string };
```

- [ ] **Step 2: Add the `ListingPlanSection` component**

Add this new component above `export function MyBusinessTab()`:

```tsx
function ListingPlanSection() {
  const [buying, setBuying] = useState(false);
  const subQ = trpc.subscriptions.myBusinessSubscription.useQuery();
  const designerPlanQ = trpc.subscriptions.plans.useQuery({ type: "designer" });
  const gatewayQ = trpc.subscriptions.activeGateway.useQuery();
  const createOrder = trpc.subscriptions.createBusinessOrder.useMutation();
  const createPayUOrder = trpc.subscriptions.createBusinessPayUOrder.useMutation();
  const verifyPayment = trpc.subscriptions.verifyBusinessPayment.useMutation();

  const sub = subQ.data as CurrentBusinessSub | null | undefined;
  const plan = (designerPlanQ.data as unknown as PlanListing[] | undefined)?.[0];

  const handleSubscribe = async () => {
    if (!plan) return;
    const gateway = gatewayQ.data?.gateway ?? "razorpay";
    setBuying(true);
    try {
      if (gateway === "razorpay") {
        const order = await createOrder.mutateAsync({ planId: plan.id });
        await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          prefill: order.prefill,
          onDismiss: () => setBuying(false),
          onSuccess: async (resp) => {
            try {
              await verifyPayment.mutateAsync({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                planId: plan.id,
              });
              toast.success("Listing plan activated!");
              subQ.refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Payment verification failed.");
            } finally {
              setBuying(false);
            }
          },
        });
      } else {
        const fields = await createPayUOrder.mutateAsync({ planId: plan.id });
        const form = document.createElement("form");
        form.method = "POST";
        form.action = fields.action;
        (Object.entries(fields) as [string, string][]).forEach(([k, v]) => {
          if (k === "action") return;
          const inp = document.createElement("input");
          inp.type = "hidden";
          inp.name = k;
          inp.value = v;
          form.appendChild(inp);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setBuying(false);
      toast.error(err instanceof Error ? err.message : "Purchase failed.");
    }
  };

  return (
    <Section title="Listing Plan">
      {subQ.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg border border-border bg-secondary/40" />
      ) : sub ? (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">{sub.planName}</span>
            <Badge tone="success">Active</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ₹{(sub.amount / 100).toLocaleString("en-IN")} · expires {fmtDate(sub.endDate)}
          </p>
        </div>
      ) : plan ? (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">{plan.name}</span>
            <span className="flex items-center gap-0.5 text-sm font-bold text-accent">
              <IndianRupee size={13} />{plan.price}/mo
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
          <button
            onClick={handleSubscribe}
            disabled={buying}
            className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-60"
          >
            {buying ? "Processing…" : "Subscribe"}
          </button>
        </div>
      ) : null}
    </Section>
  );
}
```

- [ ] **Step 3: Render it inside `MyBusinessTab`**

Find the existing `return` block's opening in `MyBusinessTab`:

```tsx
  return (
    <>
      <Head t="My Business" s="Your Home Interiors / Decor listings and the leads they've generated." />

      <Section title="Your listings">
```

Insert `<ListingPlanSection />` right after the `<Head .../>` line, before `<Section title="Your listings">`:

```tsx
  return (
    <>
      <Head t="My Business" s="Your Home Interiors / Decor listings and the leads they've generated." />

      <ListingPlanSection />

      <Section title="Your listings">
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm --filter @nxtsft/web type-check`
Expected: no errors.

Run: `pnpm --filter @nxtsft/web lint`
Expected: no new warnings beyond the single pre-existing one in `ReviewsTab.tsx` (unrelated).

- [ ] **Step 5: Production build**

Run: `pnpm --filter @nxtsft/web build`
Expected: succeeds, zero route errors, `/user-portal` route size present in the output.

- [ ] **Step 6: Live browser verification**

Using the session-bypass pattern from memory `feedback_live_verification` (create a throwaway `User` with a linked `InteriorDesigner` row so "My Business" is visible, establish a session, seed the matching `localStorage["nxtsft.session"]` entry), drive a real Playwright browser to `/user-portal#business` and confirm:
1. The "Listing Plan" section renders with the seeded `designer-monthly` plan's price (₹499/mo) and a "Subscribe" button, when no `Subscription` exists yet.
2. After directly inserting an `Active` `Subscription` row (`planId: "designer-monthly"`) via Prisma and reloading the page, the section instead shows "Active" + the correct expiry date, and the "Subscribe" button is gone.

Delete the throwaway `User`, `InteriorDesigner`, `Subscription`, and `Session` rows immediately after.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/user-portal/tabs/MyBusinessTab.tsx
git commit -m "feat(billing): add Listing Plan section to My Business tab"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Data model (Task 1 + Task 2) ✓, backend procedures + type-scoped query (Task 3) ✓, frontend section (Task 4) ✓, PayU callback route explicitly left untouched (Global Constraints + Task 3 comment) ✓, out-of-scope items (enforcement, tiers, per-listing billing) not implemented anywhere in this plan ✓.
- **No placeholders:** every step has complete, copy-pasteable code or exact commands — no "add error handling" or "similar to Task N" shorthand.
- **Type consistency:** `createBusinessOrder`/`createBusinessPayUOrder`/`verifyBusinessPayment`/`myBusinessSubscription` names and shapes in Task 3 match exactly what Task 4's frontend calls (`trpc.subscriptions.createBusinessOrder`, etc.) and what fields it reads (`order.keyId`, `order.orderId`, `fields.action`, `sub.planName`, `sub.amount`, `sub.endDate`, `plan.id`, `plan.name`, `plan.price`, `plan.tagline`).
