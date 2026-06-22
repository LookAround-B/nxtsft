# Home Seller Role Rename + Approval Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the `customer` role to `home-seller` everywhere in the codebase, add a Home Seller registration path, and gate Home Seller login behind admin/super-admin approval.

**Architecture:** The role string `"customer"` is replaced with `"home-seller"` in the DB, all tRPC routers, the TypeScript Role union, `ROLE_META`, `routes.ts`, and all portal UI files. A new `auth.registerSeller` tRPC procedure creates the user without a session; `auth.login` blocks unverified `home-seller` accounts with a clear error. The `/list` page is restricted to `home-seller` role only. Admins see a pending-approval badge and can approve with one click, which also notifies the seller.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 7, PostgreSQL, TypeScript 5.8, Tailwind CSS 4, Sonner (toasts)

## Global Constraints

- Package manager: always `pnpm add`, never `npm install`
- No `any` types — use explicit types throughout
- No comments except for non-obvious WHY
- Role key in DB and code: `"home-seller"` (hyphenated, lowercase)
- Display label: `"Home Seller"` (two words, title case)
- Portal for home-seller: `/user-portal` (same as `user` role)
- Login page for home-seller: `/login` (consumer login)
- Do not commit unless explicitly asked — build and type-check only
- Run `pnpm --filter @nxtsft/web type-check` after each task to verify no TS errors

---

### Task 1: Rename role in backend — sanitize + routers + DB

Renames `"customer"` → `"home-seller"` in the tRPC layer and migrates existing DB rows.

**Files:**
- Modify: `packages/trpc/src/sanitize.ts` (roleSchema enum)
- Modify: `packages/trpc/src/routers/auth.ts` (CONSUMER_ROLES)
- Modify: `packages/trpc/src/routers/siteVisits.ts` (inline role check)

- [ ] **Step 1: Update `roleSchema` in sanitize.ts**

In `packages/trpc/src/sanitize.ts`, find the `roleSchema` definition (around line 164) and replace `"customer"` with `"home-seller"`:

```ts
export const roleSchema = z.enum([
  "super-admin",
  "admin",
  "supervisor",
  "sales",
  "support-admin",
  "user",
  "home-seller",
]);
```

- [ ] **Step 2: Update `CONSUMER_ROLES` in auth.ts**

In `packages/trpc/src/routers/auth.ts`, line 24:

```ts
const CONSUMER_ROLES = ["user", "home-seller"] as const;
```

- [ ] **Step 3: Update siteVisits router**

In `packages/trpc/src/routers/siteVisits.ts`, line 31, replace the inline array:

```ts
} else if (["user", "home-seller"].includes(ctx.user.role)) {
```

- [ ] **Step 4: Migrate existing DB rows**

Run this SQL against the production Postgres (187.77.185.220:5433, db `nxtsft`):

```sql
UPDATE users SET role = 'home-seller' WHERE role = 'customer';
```

Run via:
```bash
pnpm --filter @nxtsft/db run db:studio
```
Or directly with psql:
```bash
psql "postgresql://USER:PASS@187.77.185.220:5433/nxtsft" -c "UPDATE users SET role = 'home-seller' WHERE role = 'customer';"
```

- [ ] **Step 5: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```
Expected: no errors (or only pre-existing errors unrelated to this task).

---

### Task 2: Rename role in frontend — auth.tsx, routes.ts, static data, SA portal tabs

Renames every frontend reference from `"customer"` to `"home-seller"` with updated display labels.

**Files:**
- Modify: `apps/web/src/lib/auth.tsx` (Role type, ROLE_META)
- Modify: `apps/web/src/lib/routes.ts` (ROLES, PORTAL_ACCESS, HOME_FOR_ROLE)
- Modify: `apps/web/src/data/static.ts` (any "customer" fixtures)
- Modify: `apps/web/src/components/sa-portal/tabs/UsersTab.tsx` (SA_ROLES, SA_ROLE_LABEL, consumerCount)
- Modify: `apps/web/src/components/sa-portal/tabs/PermissionsTab.tsx` (ROLES list, defaultMatrix)
- Modify: `apps/web/src/components/sa-portal/tabs/NotifyTab.tsx` (any "customer" reference)
- Modify: `apps/web/src/components/sa-portal/tabs/SecurityTab.tsx` (any "customer" reference)

- [ ] **Step 1: Update Role type and ROLE_META in auth.tsx**

In `apps/web/src/lib/auth.tsx`, replace the Role union (line 6–13) and ROLE_META `customer` key (lines 84–92):

```ts
export type Role =
  | "super-admin"
  | "admin"
  | "supervisor"
  | "sales"
  | "support-admin"
  | "user"
  | "home-seller";
```

And in ROLE_META, rename the key and update labels:

```ts
  "home-seller": {
    label: "Home Seller",
    portal: "/user-portal",
    portalName: "NxtSft.com Seller",
    demoEmail: "ananya@example.com",
    demoName: "Ananya Gupta",
    city: "Delhi",
    phone: "+91 9800011001",
  },
```

- [ ] **Step 2: Update routes.ts**

In `apps/web/src/lib/routes.ts`, make these three changes:

```ts
export type Role =
  | "super-admin"
  | "admin"
  | "supervisor"
  | "sales"
  | "support-admin"
  | "user"
  | "home-seller";

export const ROLES: readonly Role[] = [
  "super-admin",
  "admin",
  "supervisor",
  "sales",
  "support-admin",
  "user",
  "home-seller",
];
```

In `PORTAL_ACCESS`:
```ts
  "/user-portal": ["user", "home-seller"],
```

In `HOME_FOR_ROLE`:
```ts
  "home-seller": "/user-portal",
```

- [ ] **Step 3: Update data/static.ts**

Search for any `"customer"` string in `apps/web/src/data/static.ts`. Replace each occurrence:
- `role: "customer"` → `role: "home-seller"`
- Any label `"Customer"` in fixture objects → `"Home Seller"`

- [ ] **Step 4: Update SA portal UsersTab**

In `apps/web/src/components/sa-portal/tabs/UsersTab.tsx`:

```ts
const SA_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin", "user", "home-seller"] as const;
const SA_ROLE_LABEL: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  supervisor: "Supervisor",
  sales: "Sales Rep",
  "support-admin": "Support Admin",
  user: "Home Buyer",
  "home-seller": "Home Seller",
};
```

And update the consumerCount filter (line 55):
```ts
const consumerCount = users.filter((u) => u.role === "user" || u.role === "home-seller").length;
```

- [ ] **Step 5: Update SA portal PermissionsTab**

In `apps/web/src/components/sa-portal/tabs/PermissionsTab.tsx`:

Replace the ROLES array (line 22–29):
```ts
const ROLES: { key: string; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "supervisor", label: "Supervisor" },
  { key: "sales", label: "Sales Rep" },
  { key: "support-admin", label: "Support" },
  { key: "user", label: "Home Buyer" },
  { key: "home-seller", label: "Home Seller" },
];
```

In `defaultMatrix()`, rename the `customer` key:
```ts
"home-seller": { listings: "read", leads: "none", crm: "none", siteVisits: "write", subscriptions: "read", marketing: "none", reports: "none", teams: "none", users: "none", support: "read", config: "none", security: "none" },
```

- [ ] **Step 6: Update NotifyTab and SecurityTab**

In `apps/web/src/components/sa-portal/tabs/NotifyTab.tsx`, find any string `"customer"` and replace with `"home-seller"`. Do the same in `apps/web/src/components/sa-portal/tabs/SecurityTab.tsx`.

- [ ] **Step 7: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```
Expected: no TS errors from the renamed role.

---

### Task 3: Add `auth.registerSeller` tRPC procedure + login gate

Adds the new seller registration endpoint and blocks unverified home-sellers at login.

**Files:**
- Modify: `packages/trpc/src/routers/auth.ts`

**Interfaces:**
- Produces: `auth.registerSeller` — input `{ name, email, phone, password, city }`, returns `{ success: true }`
- Produces: modified `auth.login` — throws `UNAUTHORIZED` if `role === "home-seller" && !verified`

- [ ] **Step 1: Add `registerSeller` procedure**

In `packages/trpc/src/routers/auth.ts`, after the closing of the `register` procedure (after line 149), add:

```ts
  // Public registration for home sellers (role: home-seller) — no session granted
  registerSeller: publicProcedure
    .use(registerRateLimit)
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        city: geoTextSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [existingEmail, existingPhone] = await Promise.all([
        prisma.user.findUnique({ where: { email: input.email } }),
        prisma.user.findUnique({ where: { phone: input.phone } }),
      ]);

      if (existingEmail)
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
      if (existingPhone)
        throw new TRPCError({ code: "CONFLICT", message: "Phone already registered." });

      const passwordHash = await bcrypt.hash(input.password, 12);
      const seller = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          role: "home-seller",
          passwordHash,
          verified: false,
        },
      });

      // Notify all admins and super-admins
      const admins = await prisma.user.findMany({
        where: { role: { in: ["admin", "super-admin"] } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "seller_approval",
            title: "New Home Seller pending approval",
            content: `${seller.name} (${seller.email}) registered and is awaiting account approval.`,
          })),
        });
      }

      return { success: true as const };
    }),
```

- [ ] **Step 2: Add login gate in `auth.login`**

In `packages/trpc/src/routers/auth.ts`, inside the `login` mutation after the password `valid` check (around line 162), add before the session creation:

```ts
      if (user.role === "home-seller" && !user.verified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account is pending approval. You'll be notified once an admin approves it.",
        });
      }
```

The full login mutation body (after `if (!valid) throw ...`) should read:

```ts
      if (user.role === "home-seller" && !user.verified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account is pending approval. You'll be notified once an admin approves it.",
        });
      }

      const token = generateToken();
      // ... rest of existing session creation code unchanged
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```
Expected: no errors.

---

### Task 4: Update admin `verify` mutation to notify the seller on approval

When an admin approves a Home Seller, the seller gets a notification so they know they can log in.

**Files:**
- Modify: `packages/trpc/src/routers/admin.ts` (verify mutation, lines 126–134)

- [ ] **Step 1: Extend the verify mutation**

Replace the existing `verify` mutation body in `packages/trpc/src/routers/admin.ts`:

```ts
    verify: adminProcedure
      .input(z.object({ userId: cuidSchema }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.update({
          where: { id: input.userId },
          data: { verified: true, verifiedAt: new Date() },
          select: { ...safeUserSelect, role: true, name: true },
        });

        if (user.role === "home-seller") {
          await prisma.notification.create({
            data: {
              userId: input.userId,
              type: "account_approved",
              title: "Your account has been approved!",
              content: "You can now log in to NxtSft and list your property.",
            },
          });
        }

        return user;
      }),
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```
Expected: no errors.

---

### Task 5: Register page — role toggle + Home Seller pending screen

The `/register` page gets a Buyer / Seller toggle. Seller registrations show a pending screen instead of redirecting to the portal.

**Files:**
- Modify: `apps/web/src/app/register/page.tsx`

- [ ] **Step 1: Add `registerSeller` to AuthProvider**

In `apps/web/src/lib/auth.tsx`, add to the `Ctx` interface:

```ts
  registerSeller: (name: string, email: string, phone: string, password: string, city: string) => Promise<void>;
```

Add the implementation inside `AuthProvider` (alongside the existing `register` function):

```ts
  async function registerSeller(
    name: string,
    email: string,
    phone: string,
    password: string,
    city: string,
  ): Promise<void> {
    await makeTRPC().auth.registerSeller.mutate({ name, email, phone, password, city });
    // No session — seller must wait for admin approval
  }
```

Add `registerSeller` to the `AuthContext.Provider` value object.

- [ ] **Step 2: Rewrite the register page with role toggle**

Replace the contents of `apps/web/src/app/register/page.tsx` with:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Home, Building2 } from "lucide-react";
import { useAuth, ROLE_META } from "@/lib/auth";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai",
  "Ahmedabad", "Kolkata", "Jaipur", "Surat", "Lucknow", "Kanpur",
];

type RegistrationType = "buyer" | "seller";

export default function RegisterPage() {
  const router = useRouter();
  const { session, signOut, register, registerSeller } = useAuth();

  const [regType, setRegType] = useState<RegistrationType>("buyer");
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sellerPending, setSellerPending] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Enter your full name (min 2 characters)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
    if (!form.city) errs.city = "Select your city";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(form.password)) errs.password = "Password must contain an uppercase letter";
    if (!/[a-z]/.test(form.password)) errs.password = "Password must contain a lowercase letter";
    if (!/\d/.test(form.password)) errs.password = "Password must contain a number";
    if (form.password !== form.confirm) errs.confirm = "Passwords do not match";
    if (!agreed) errs.agreed = "You must accept the terms to continue";
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      if (regType === "buyer") {
        const s = await register(form.name.trim(), form.email.trim(), form.phone.replace(/\s/g, ""), form.password, form.city);
        toast.success(`Welcome to NxtSft, ${s.name.split(" ")[0]}! You have 1 free credit.`);
        router.push(ROLE_META[s.role].portal);
      } else {
        await registerSeller(form.name.trim(), form.email.trim(), form.phone.replace(/\s/g, ""), form.password, form.city);
        setSellerPending(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
      else if (msg.toLowerCase().includes("phone")) setErrors({ phone: msg });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sellerPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <CheckCircle2 className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-black text-navy">Application Submitted!</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your Home Seller account is under review. Our team will verify your details and notify you
            once your account is approved. This usually takes 1–2 business days.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Questions? Contact us at{" "}
            <a href="mailto:support@nxtsft.com" className="font-semibold text-accent hover:underline">
              support@nxtsft.com
            </a>
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        {/* Left decorative panel */}
        <div className="hidden animate-fade-up flex-col justify-between rounded-3xl bg-gradient-to-br from-navy via-navy-deep to-accent p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">
              Join NxtSft.com
            </div>
            <h1 className="mt-6 font-display text-4xl font-black leading-tight">
              {regType === "buyer" ? (
                <>Your perfect home<br />is one step away.<br /><span className="text-white/55">Sign up. Explore. Own.</span></>
              ) : (
                <>List your property.<br />Reach lakh+ buyers.<br /><span className="text-white/55">Zero brokerage. Full control.</span></>
              )}
            </h1>
            <ul className="mt-8 space-y-3">
              {(regType === "buyer"
                ? ["Zero brokerage — save lakhs", "RERA-verified listings only", "Dedicated relationship manager", "1 free credit on signup, no card required"]
                : ["Verified buyer audience", "RERA-compliant listings", "Dedicated account manager", "Pay only when you sell"]
              ).map((pt) => (
                <li key={pt} className="flex items-center gap-2.5 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-lg animate-fade-up delay-75">
          {session && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-foreground/80">
                Already signed in as <strong className="text-navy">{session.name}</strong>
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          )}

          <div className="text-xs font-bold uppercase tracking-widest text-accent">Get started free</div>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">Create your account</h2>

          {/* Role toggle */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["buyer", "seller"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setRegType(t); setErrors({}); }}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition ${
                  regType === t
                    ? "border-accent bg-accent/5"
                    : "border-border bg-white hover:border-accent/40"
                }`}
              >
                {t === "buyer" ? <Home size={20} className={regType === t ? "text-accent" : "text-muted-foreground"} /> : <Building2 size={20} className={regType === t ? "text-accent" : "text-muted-foreground"} />}
                <div>
                  <div className={`text-sm font-bold ${regType === t ? "text-accent" : "text-navy"}`}>
                    {t === "buyer" ? "Home Buyer" : "Home Seller"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t === "buyer" ? "Browse & buy" : "List & sell"}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {regType === "seller" && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
              Home Seller accounts require admin approval before you can log in and list properties.
            </p>
          )}

          <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Enter your full name"
                autoComplete="name"
                className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.name ? "border-rose-400" : "border-input"}`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="your@email.com"
                autoComplete="email"
                className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.email ? "border-rose-400" : "border-input"}`}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Phone Number</label>
              <div className="mt-1.5 flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-input bg-secondary px-3.5 text-sm font-medium text-foreground/60">+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="9876543210"
                  maxLength={10}
                  autoComplete="tel"
                  className={`min-w-0 flex-1 rounded-r-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.phone ? "border-rose-400" : "border-input"}`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Your City</label>
              <Select value={form.city || undefined} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                <SelectTrigger className={`mt-1.5 rounded-xl px-3.5 py-3 ${errors.city ? "border-rose-400" : ""}`}>
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.city && <p className="mt-1 text-xs text-rose-500">{errors.city}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-background px-3.5 py-3 pr-11 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.password ? "border-rose-400" : "border-input"}`}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Confirm Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={set("confirm")}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-background px-3.5 py-3 pr-11 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.confirm ? "border-rose-400" : "border-input"}`}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-xs text-rose-500">{errors.confirm}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <div className="relative mt-0.5 shrink-0">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                  <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${agreed ? "border-accent bg-accent" : "border-border bg-white"}`}>
                    {agreed && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-sm leading-relaxed text-foreground/80">
                  I accept the{" "}
                  <Link href="/terms" className="font-semibold text-accent hover:underline">Terms &amp; Conditions</Link>{" "}
                  and agree to receive communication from NxtSft.com.
                </span>
              </label>
              {errors.agreed && <p className="mt-1 text-xs text-rose-500">{errors.agreed}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {regType === "buyer" ? "Creating account…" : "Submitting application…"}
                </span>
              ) : (
                regType === "buyer" ? "Create Account →" : "Submit Application →"
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent hover:underline">Sign In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```
Expected: no errors.

---

### Task 6: Add pending-approval badge to admin and SA portal Users tabs

Admins and super-admins see a count of Home Sellers awaiting approval prominently so they don't miss them.

**Files:**
- Modify: `apps/web/src/components/sa-portal/tabs/UsersTab.tsx`
- Modify: `apps/web/src/components/admin-portal/tabs/UsersTab.tsx` (if it exists — check first)

- [ ] **Step 1: Add pending-seller count and filter to SA UsersTab**

In `apps/web/src/components/sa-portal/tabs/UsersTab.tsx`, add:

1. A `pendingCount` computed value after the existing `consumerCount`:
```ts
const pendingCount = users.filter((u) => u.role === "home-seller" && !u.verified).length;
```

2. A `pendingOnly` state filter toggle at the top of the component (after the other `useState` calls):
```ts
const [pendingOnly, setPendingOnly] = useState(false);
```

3. Filter `users` before rendering the table:
```ts
const displayed = pendingOnly ? users.filter((u) => u.role === "home-seller" && !u.verified) : users;
```

4. Add a stat card for pending approvals (fourth card in the grid):
```tsx
<StatCard
  label="Pending Approval"
  value={String(pendingCount)}
  sub="Home Sellers awaiting review"
  accent={pendingCount > 0 ? "text-amber-600" : undefined}
/>
```

5. Add a toggle button in the Section action area (alongside search and role filter):
```tsx
<button
  onClick={() => setPendingOnly((v) => !v)}
  className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
    pendingOnly
      ? "border-amber-400 bg-amber-50 text-amber-700"
      : "border-border bg-white text-navy hover:bg-secondary"
  }`}
>
  {pendingOnly ? "Show all" : `Pending (${pendingCount})`}
</button>
```

6. Replace `users.map(...)` in the table with `displayed.map(...)`.

- [ ] **Step 2: Check if admin portal has its own UsersTab**

```bash
ls "apps/web/src/components/admin-portal/tabs/"
```

If `UsersTab.tsx` exists there, apply the same `pendingCount` stat card and `pendingOnly` toggle to it as well (same pattern as Step 1 above).

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```

---

### Task 7: Gate the `/list` page to Home Sellers only

Any authenticated user can currently access `/list`. Restrict it to `home-seller` role (verified implicitly since unverified sellers can't log in).

**Files:**
- Modify: `apps/web/src/app/list/page.tsx`

- [ ] **Step 1: Add role guard at the top of `ListPropertyPage`**

In `apps/web/src/app/list/page.tsx`, the component starts at line 133 with:
```ts
export default function ListPropertyPage() {
  const { session } = useAuth();
```

Add a guard block immediately after the `useAuth()` line. The guard must be after all hook calls to satisfy React's rules of hooks — so read `session` first, then conditionally render:

Find where the component returns JSX (after all the state/hook declarations) and add this guard render before the main return:

```tsx
  // After all hooks are declared, before the main return:
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Sign in to list your property</h2>
          <p className="mt-2 text-sm text-muted-foreground">You need a Home Seller account to list a property on NxtSft.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/login" className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
              Sign In
            </Link>
            <Link href="/register" className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-navy transition hover:bg-secondary">
              Register as Home Seller
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (session.role !== "home-seller") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Home Sellers only</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Property listings are for Home Seller accounts. If you want to list your property,
            register as a Home Seller.
          </p>
          <Link href="/register" className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
            Register as Home Seller
          </Link>
        </div>
      </div>
    );
  }
```

Make sure to add `Building2` to the existing import from `"lucide-react"` and `Link` from `"next/link"` if not already imported.

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @nxtsft/web type-check
```

- [ ] **Step 3: Full build check**

```bash
pnpm --filter @nxtsft/web build
```
Expected: build completes with no errors.

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Rename `customer` → `home-seller` in DB | Task 1, Step 4 |
| Rename in tRPC sanitize + routers | Task 1 |
| Rename in frontend types, ROLE_META, routes | Task 2 |
| Rename in SA portal UI files | Task 2 |
| `auth.registerSeller` — no session, creates pending user | Task 3, Step 1 |
| Notify admins/super-admins on seller registration | Task 3, Step 1 |
| Login gate blocks unverified home-sellers | Task 3, Step 2 |
| Verify mutation notifies the seller on approval | Task 4 |
| Register page role toggle (Buyer / Seller) | Task 5 |
| Seller pending screen after registration | Task 5 |
| Pending-approval badge in admin/SA Users tab | Task 6 |
| `/list` page restricted to `home-seller` role | Task 7 |

**Placeholder scan:** None found.

**Type consistency:** `"home-seller"` used consistently as the role key in all tasks. `registerSeller` function name consistent between auth.tsx (Task 5, Step 1) and the tRPC procedure (Task 3, Step 1).
