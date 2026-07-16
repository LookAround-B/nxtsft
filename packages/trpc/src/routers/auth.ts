import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  geoTextSchema,
  safeString,
} from "../sanitize";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import prisma from "@nxtsft/db";
import { hashToken, SESSION_TTL_DAYS } from "@nxtsft/shared";
import { notify, notifyCredit, portalBase } from "../notify";
import { uniqueAgentSlug, defaultAgentMetadata } from "../agentProfile";
import { generateOtp, storeOtp, verifyOtp, isSignupOtpEnabled } from "../otp";
import { sendWhatsAppTemplate } from "../bhashsms";
import {
  router,
  publicProcedure,
  protectedProcedure,
  authRateLimit,
  registerRateLimit,
} from "../server";

// Oldest sessions beyond this many per user are dropped on new login (GOL-268
// L2) — bounds how many devices/browsers can hold a live session at once.
const MAX_SESSIONS_PER_USER = 5;
const CONSUMER_ROLES = ["user", "home-seller"] as const;

const googleClient = new OAuth2Client();

// Verify a Google ID token (from the client-side Google button) and return its payload.
async function verifyGoogleCredential(credential: string) {
  const audience = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Google sign-in is not configured.",
    });
  }
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    return ticket.getPayload();
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid Google sign-in. Please try again.",
    });
  }
}

function generateToken() {
  return randomBytes(32).toString("hex");
}

// Best-effort sign-in trail for the user's "Recent Activity" feed.
async function logSignIn(userId: string) {
  try {
    await prisma.auditLog.create({
      data: { userId, action: "auth.login", entity: "User", entityId: userId },
    });
  } catch {
    // audit is best-effort; never block login
  }
}

// Best-effort failed-login trail — userId is null when email doesn't exist.
async function logFailedLogin(email: string, userId?: string) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? null, action: "auth.login_failed", entity: "User", entityId: email },
    });
  } catch {
    // audit is best-effort; never block login
  }
}

// Every new consumer becomes a follow-up lead for admin (boss ask). A Lead
// requires a phone, so this only fires once we have one — immediately for
// password sign-ups, and after the Google phone-capture step. Idempotent:
// one "Signup" lead per user, and never blocks the sign-up itself.
async function createSignupLead(user: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
}): Promise<void> {
  if (!user.phone) return;
  try {
    const existing = await prisma.lead.findFirst({
      where: { userId: user.id, source: "Signup" },
      select: { id: true },
    });
    if (existing) return;
    await prisma.lead.create({
      data: {
        userId: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email ?? undefined,
        city: user.city ?? undefined,
        source: "Signup",
        status: "New",
        interest: "New sign-up — follow up",
      },
    });
  } catch {
    // best-effort — a lead failure must never fail registration
  }
}

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_TTL_DAYS);
  return d;
}

// Creates a session row (token stored as sha256(rawToken), never plaintext —
// GOL-268 L2) and returns the raw token for the client. Also caps how many
// live sessions a user can hold at once, dropping the oldest beyond the cap.
async function createSession(userId: string): Promise<string> {
  const rawToken = generateToken();
  await prisma.session.create({
    data: { userId, token: hashToken(rawToken), expiresAt: sessionExpiry() },
  });

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: MAX_SESSIONS_PER_USER,
  });
  if (sessions.length > 0) {
    await prisma.session.deleteMany({ where: { id: { in: sessions.map((s) => s.id) } } });
  }

  return rawToken;
}

// Fields safe to return to the client — never include passwordHash
function safeUser(user: {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  avatar: string | null;
  role: string;
  verified: boolean;
  phoneVerified: boolean;
  city: string;
  credits: number;
  joined: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    verified: user.verified,
    phoneVerified: user.phoneVerified,
    city: user.city,
    credits: user.credits,
    joined: user.joined,
  };
}

async function grantCredits(userId: string, amount: number, reason: string) {
  await Promise.all([
    prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } }),
    prisma.creditTransaction.create({ data: { userId, type: "credit", amount, reason } }),
  ]);
  await notifyCredit({ userId, type: "credit", amount, reason });
}

/**
 * Resolve a signup's phone-verification state from an optional OTP code.
 * - A code is supplied → it must be valid (throws on wrong/expired), returns true.
 * - No code → returns false (unverified). This is the graceful fallback for when
 *   WhatsApp/OTP delivery is down: signup still proceeds, phone flagged unverified.
 */
async function resolveSignupPhoneVerified(phone: string, code?: string): Promise<boolean> {
  if (!code) return false;
  const result = await verifyOtp(phone, code);
  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "This OTP has expired — request a new one."
        : result.reason === "too_many_attempts"
          ? "Too many incorrect attempts — request a new OTP."
          : "Incorrect OTP. Please check and try again.";
    throw new TRPCError({ code: "UNAUTHORIZED", message });
  }
  return true;
}

export const authRouter = router({
  // Public registration for home buyers (role: user)
  register: publicProcedure
    .use(registerRateLimit)
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        city: geoTextSchema,
        // LA-341: "Get updates on WhatsApp" consent — required by Meta before
        // any template message may be sent to the number.
        waOptIn: z.boolean().optional(),
        // WhatsApp OTP verifying the phone. Omitted → phone stored unverified
        // (fallback when OTP delivery is down).
        otp: z.string().regex(/^\d{6}$/).optional(),
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

      const phoneVerified = await resolveSignupPhoneVerified(input.phone, input.otp);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          role: "user",
          passwordHash,
          phoneVerified,
          ...(input.waOptIn ? { metadata: { waOptIn: true } } : {}),
        },
      });

      // 1 welcome credit on registration
      await grantCredits(user.id, 1, "welcome");
      await notify({
        userId: user.id,
        type: "welcome",
        title: "Welcome to NxtSft 🎉",
        content: "Your account is ready. Start exploring properties.",
        actionUrl: "/properties",
      });

      // Every new user is a follow-up lead for admin (has phone here).
      await createSignupLead(user);

      const token = await createSession(user.id);

      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  // Public registration for home sellers (role: home-seller) and RERA agents
  // (role: agent) — both onboard through the same admin approval queue and are
  // created unverified (blocked from login until an admin approves). No session
  // is granted. `applyAs: "agent"` also seeds a default directory profile so an
  // approved agent shows on /agents immediately.
  registerSeller: publicProcedure
    .use(registerRateLimit)
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        city: geoTextSchema,
        applyAs: z.enum(["seller", "agent"]).optional(),
        // LA-341: WhatsApp updates consent (see register above).
        waOptIn: z.boolean().optional(),
        // WhatsApp OTP verifying the phone (see register above).
        otp: z.string().regex(/^\d{6}$/).optional(),
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

      const phoneVerified = await resolveSignupPhoneVerified(input.phone, input.otp);
      const isAgent = input.applyAs === "agent";
      const passwordHash = await bcrypt.hash(input.password, 12);
      const applicant = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          role: isAgent ? "agent" : "home-seller",
          passwordHash,
          verified: false,
          phoneVerified,
          ...(isAgent && { slug: await uniqueAgentSlug(input.name) }),
          // Agent directory metadata and the WA consent flag share the same
          // Json column — merge rather than overwrite.
          ...((isAgent || input.waOptIn) && {
            metadata: {
              ...(isAgent ? defaultAgentMetadata(input.name, input.city) : {}),
              ...(input.waOptIn ? { waOptIn: true } : {}),
            },
          }),
        },
      });

      // Welcome the applicant — surfaces once their account is approved & they log in.
      await notify({
        userId: applicant.id,
        type: "welcome",
        title: "Account created",
        content: isAgent
          ? "Your Agent / Partner account is pending admin approval. We'll notify you once it's approved."
          : "Your Home Seller account is pending admin approval. We'll notify you once it's approved.",
      });

      // Notify all admins and super-admins
      const admins = await prisma.user.findMany({
        where: { role: { in: ["admin", "super-admin"] } },
        select: { id: true, role: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "seller_approval",
            title: isAgent
              ? "New Agent / Partner pending approval"
              : "New Home Seller pending approval",
            content: `${applicant.name} (${applicant.email}) registered and is awaiting account approval.`,
            actionUrl: `${portalBase(a.role)}#seller-approvals`,
          })),
        });
      }

      return { success: true as const };
    }),

  // Login for consumers (/login page)
  login: publicProcedure
    .use(authRateLimit)
    .input(z.object({ email: emailSchema, password: passwordSchema }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user || !user.passwordHash) {
        void logFailedLogin(input.email);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        void logFailedLogin(input.email, user.id);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      if (!user.active) {
        void logFailedLogin(input.email, user.id);
        throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
      }

      // Home sellers and agents both onboard through the admin approval queue
      // and stay blocked from login until an admin verifies their account.
      if ((user.role === "home-seller" || user.role === "agent") && !user.verified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account is pending approval. You'll be notified once an admin approves it.",
        });
      }

      // Grant 3 demo credits on first login if balance is zero (consumer roles only)
      if (
        CONSUMER_ROLES.includes(user.role as (typeof CONSUMER_ROLES)[number]) &&
        user.credits === 0
      ) {
        await grantCredits(user.id, 3, "demo");
      }

      const token = await createSession(user.id);

      await logSignIn(user.id);
      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  // Login for staff roles (/admin-login page)
  loginStaff: publicProcedure
    .use(authRateLimit)
    .input(z.object({ email: emailSchema, password: passwordSchema }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user || !user.passwordHash) {
        void logFailedLogin(input.email);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      const staffRoles = ["super-admin", "admin", "supervisor", "sales", "support-admin"];
      if (!staffRoles.includes(user.role)) {
        void logFailedLogin(input.email, user.id);
        throw new TRPCError({ code: "FORBIDDEN", message: "Use the consumer login page." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        void logFailedLogin(input.email, user.id);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      if (!user.active) {
        void logFailedLogin(input.email, user.id);
        throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
      }

      const token = await createSession(user.id);

      await logSignIn(user.id);
      return { token, user: safeUser(user) };
    }),

  // ── WhatsApp OTP login ─────────────────────────────────────────────────────
  // OTP is the primary login for everyone (consumers + staff); email+password
  // stays as a fallback. requestOtp finds the account by phone, generates a code,
  // stores it (Redis, 5-min TTL) and sends it via the approved BhashSMS template.
  requestOtp: publicProcedure
    .use(authRateLimit)
    .input(z.object({ phone: phoneSchema }))
    .mutation(async ({ input }) => {
      if (!isSignupOtpEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "OTP login isn't available right now — please use email & password.",
        });
      }
      const user = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No account is registered with this mobile number." });
      }
      if (!user.active) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
      }
      if ((user.role === "home-seller" || user.role === "agent") && !user.verified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account is pending approval. You'll be notified once an admin approves it.",
        });
      }

      const code = generateOtp();
      await storeOtp(input.phone, code);
      const template = process.env.BHASHSMS_TEMPLATE_SIGNUP_OTP!;
      // Authentication OTP templates must be sent with stype=auth (not "normal").
      const res = await sendWhatsAppTemplate({ to: input.phone, template, params: [code], stype: "auth" });
      if (!res.sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't send the OTP right now. Please try again or use email & password.",
        });
      }
      return { ok: true };
    }),

  // Verify the OTP and issue a session — same session machinery as password login.
  loginWithOtp: publicProcedure
    .use(authRateLimit)
    .input(z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }))
    .mutation(async ({ input }) => {
      const result = await verifyOtp(input.phone, input.code);
      if (!result.ok) {
        const message =
          result.reason === "expired"
            ? "This OTP has expired — request a new one."
            : result.reason === "too_many_attempts"
              ? "Too many incorrect attempts — request a new OTP."
              : "Incorrect OTP. Please check and try again.";
        throw new TRPCError({ code: "UNAUTHORIZED", message });
      }

      const user = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "No account found for this number." });
      if (!user.active) throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
      if ((user.role === "home-seller" || user.role === "agent") && !user.verified) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Your account is pending approval." });
      }

      if (CONSUMER_ROLES.includes(user.role as (typeof CONSUMER_ROLES)[number]) && user.credits === 0) {
        await grantCredits(user.id, 3, "demo");
      }

      const token = await createSession(user.id);
      await logSignIn(user.id);
      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  // Send an OTP to verify a NEW number at signup. Unlike requestOtp (login), this
  // requires the number to be UNregistered and rejects taken email/phone up front.
  // Throws if OTP is disabled or delivery fails, so the client can fall back to
  // registering the number unverified.
  requestSignupOtp: publicProcedure
    .use(authRateLimit)
    .input(z.object({ phone: phoneSchema, email: emailSchema.optional() }))
    .mutation(async ({ input }) => {
      if (!isSignupOtpEnabled()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "OTP verification isn't available right now." });
      }
      const [existingPhone, existingEmail] = await Promise.all([
        prisma.user.findUnique({ where: { phone: input.phone } }),
        input.email ? prisma.user.findUnique({ where: { email: input.email } }) : Promise.resolve(null),
      ]);
      if (existingPhone) {
        throw new TRPCError({ code: "CONFLICT", message: "This mobile number is already registered. Try logging in instead." });
      }
      if (existingEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already registered. Try logging in instead." });
      }

      const code = generateOtp();
      await storeOtp(input.phone, code);
      const template = process.env.BHASHSMS_TEMPLATE_SIGNUP_OTP!;
      const res = await sendWhatsAppTemplate({ to: input.phone, template, params: [code], stype: "auth" });
      if (!res.sent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't send the OTP right now. Please try again." });
      }
      return { ok: true };
    }),

  // Sign in / sign up with a Google ID token (consumer role: user)
  googleSignIn: publicProcedure
    .use(authRateLimit)
    .input(z.object({ credential: safeString(8192, 10) }))
    .mutation(async ({ input }) => {
      const payload = await verifyGoogleCredential(input.credential);
      const email = payload?.email;
      if (!email) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Google did not return an email." });
      }

      let user = await prisma.user.findUnique({ where: { email } });
      const isNewUser = !user;

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: payload?.name ?? email.split("@")[0]!,
            avatar: payload?.picture ?? null,
            role: "user",
            verified: payload?.email_verified ?? false,
            city: "India",
          },
        });
      }

      if (!user.active) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
      }

      // A returning user who chose "sell" after Google sign-up is a pending
      // home-seller — keep them blocked until an admin approves, same rule as
      // password login, so re-signing-in with Google can't bypass approval.
      if ((user.role === "home-seller" || user.role === "agent") && !user.verified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account is pending approval. You'll be notified once an admin approves it.",
        });
      }

      if (isNewUser) {
        // Welcome credit is deferred to the phone-capture step ("update mobile
        // number to unlock 1 credit") so it doubles as an incentive to give us
        // a reachable number. See completePhone.
        await notify({
          userId: user.id,
          type: "welcome",
          title: "Welcome to NxtSft 🎉",
          content: "Add your mobile number to unlock your free credit and start exploring.",
          actionUrl: "/properties",
        });
      } else if (
        CONSUMER_ROLES.includes(user.role as (typeof CONSUMER_ROLES)[number]) &&
        user.credits === 0 &&
        !!user.phone
      ) {
        // Re-engagement top-up only for reachable users — don't let someone skip
        // the phone step and still collect credits.
        await grantCredits(user.id, 3, "demo");
      }

      const token = await createSession(user.id);

      await logSignIn(user.id);
      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      // Google gives us no phone; the client must collect one (via completePhone)
      // so the user is reachable and becomes a follow-up lead.
      return { token, user: safeUser(freshUser), needsPhone: !freshUser.phone };
    }),

  // Collect a mobile number after Google sign-up (Google returns none). Sets the
  // phone and creates the follow-up signup-lead now that we can reach them.
  completePhone: protectedProcedure
    .input(
      z.object({
        phone: phoneSchema,
        // Role the user chose after Google sign-up (Google can't ask up-front).
        applyAs: z.enum(["buyer", "seller"]).default("buyer"),
        // WhatsApp OTP verifying the phone (see register above).
        otp: z.string().regex(/^\d{6}$/).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (existingPhone && existingPhone.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Phone already registered." });
      }

      const phoneVerified = await resolveSignupPhoneVerified(input.phone, input.otp);

      // Seller path: convert this Google buyer into a pending home-seller — the
      // same admin-approval queue as the /register seller flow. They're signed
      // out and must wait for approval (login + googleSignIn block unverified
      // sellers), so no promotion credit and no active session.
      if (input.applyAs === "seller") {
        const seller = await prisma.user.update({
          where: { id: ctx.user.id },
          data: { phone: input.phone, role: "home-seller", verified: false, phoneVerified },
        });
        await createSignupLead(seller);
        await notify({
          userId: seller.id,
          type: "welcome",
          title: "Account created",
          content:
            "Your Home Seller account is pending admin approval. We'll notify you once it's approved.",
        });
        const admins = await prisma.user.findMany({
          where: { role: { in: ["admin", "super-admin"] } },
          select: { id: true, role: true },
        });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              type: "seller_approval",
              title: "New Home Seller pending approval",
              content: `${seller.name} (${seller.email}) signed up with Google and is awaiting account approval.`,
              actionUrl: `${portalBase(a.role)}#seller-approvals`,
            })),
          });
        }
        // Invalidate every session — an unverified seller must not stay logged in.
        await prisma.session.deleteMany({ where: { userId: seller.id } });
        return { pendingApproval: true as const, user: safeUser(seller) };
      }

      // Buyer path: set phone, then "update mobile number to unlock 1 credit" —
      // auto-credit 1 promotion credit (the ₹99 home-buyer credit) to the
      // wallet, once, as the reward for giving us a reachable number.
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { phone: input.phone, phoneVerified },
      });
      const alreadyRewarded = await prisma.creditTransaction.findFirst({
        where: { userId: user.id, reason: "promotion" },
        select: { id: true },
      });
      if (!alreadyRewarded) {
        await grantCredits(user.id, 1, "promotion");
        await notify({
          userId: user.id,
          type: "welcome",
          title: "1 free credit unlocked 🎉",
          content: "Thanks for adding your number — use your credit to unlock an owner contact.",
          actionUrl: "/properties",
        });
      }

      await createSignupLead(user);
      const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { pendingApproval: false as const, user: safeUser(fresh) };
    }),

  // A logged-in user verifies (and may correct) their WhatsApp number to earn the
  // verified badge. Unlike requestSignupOtp, this ALLOWS the user's own current
  // number — it only rejects a number registered to a DIFFERENT account.
  requestMyPhoneOtp: protectedProcedure
    .use(authRateLimit)
    .input(z.object({ phone: phoneSchema }))
    .mutation(async ({ input, ctx }) => {
      if (!isSignupOtpEnabled()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "OTP verification isn't available right now." });
      }
      const owner = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (owner && owner.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This mobile number is already registered to another account." });
      }
      const code = generateOtp();
      await storeOtp(input.phone, code);
      const template = process.env.BHASHSMS_TEMPLATE_SIGNUP_OTP!;
      const res = await sendWhatsAppTemplate({ to: input.phone, template, params: [code], stype: "auth" });
      if (!res.sent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't send the OTP right now. Please try again." });
      }
      return { ok: true };
    }),

  // Verify the OTP → mark the current user's phone verified (updating the number
  // if they corrected it to their WhatsApp one). Grants the one-time promotion
  // credit if they had no number before (mirrors completePhone).
  verifyMyPhone: protectedProcedure
    .input(z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }))
    .mutation(async ({ input, ctx }) => {
      const owner = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (owner && owner.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This mobile number is already registered to another account." });
      }
      const result = await verifyOtp(input.phone, input.code);
      if (!result.ok) {
        const message =
          result.reason === "expired"
            ? "This OTP has expired — request a new one."
            : result.reason === "too_many_attempts"
              ? "Too many incorrect attempts — request a new OTP."
              : "Incorrect OTP. Please check and try again.";
        throw new TRPCError({ code: "UNAUTHORIZED", message });
      }

      const me = await prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { phone: true } });
      const hadNoPhone = !me.phone;
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { phone: input.phone, phoneVerified: true },
      });
      if (hadNoPhone) {
        const alreadyRewarded = await prisma.creditTransaction.findFirst({
          where: { userId: user.id, reason: "promotion" },
          select: { id: true },
        });
        if (!alreadyRewarded) await grantCredits(user.id, 1, "promotion");
      }
      const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { user: safeUser(fresh) };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.token) {
      await prisma.session.deleteMany({ where: { token: hashToken(ctx.token) } });
    }
    return { ok: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ? safeUser(ctx.user) : null;
  }),
});
