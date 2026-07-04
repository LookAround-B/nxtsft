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
import { notify, notifyCredit } from "../notify";
import { uniqueAgentSlug, defaultAgentMetadata } from "../agentProfile";
import {
  router,
  publicProcedure,
  protectedProcedure,
  authRateLimit,
  registerRateLimit,
} from "../server";

const SESSION_TTL_DAYS = 30;
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

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_TTL_DAYS);
  return d;
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
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          role: "user",
          passwordHash,
        },
      });

      // 1 welcome credit on registration
      await grantCredits(user.id, 1, "welcome");
      await notify({
        userId: user.id,
        type: "welcome",
        title: "Welcome to NxtSft 🎉",
        content: "Your account is ready. Start exploring properties.",
      });

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

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
          ...(isAgent && {
            slug: await uniqueAgentSlug(input.name),
            metadata: defaultAgentMetadata(input.name, input.city),
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
        select: { id: true },
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

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

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

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

      await logSignIn(user.id);
      return { token, user: safeUser(user) };
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

      if (isNewUser) {
        await grantCredits(user.id, 1, "welcome");
        await notify({
          userId: user.id,
          type: "welcome",
          title: "Welcome to NxtSft 🎉",
          content: "Your account is ready. Start exploring properties.",
        });
      } else if (
        CONSUMER_ROLES.includes(user.role as (typeof CONSUMER_ROLES)[number]) &&
        user.credits === 0
      ) {
        await grantCredits(user.id, 3, "demo");
      }

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

      await logSignIn(user.id);
      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.token) {
      await prisma.session.deleteMany({ where: { token: ctx.token } });
    }
    return { ok: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ? safeUser(ctx.user) : null;
  }),
});
