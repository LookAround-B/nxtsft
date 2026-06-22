import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  geoTextSchema,
  safeString,
} from "../sanitize.js";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import prisma from "@nxtsft/db";
import {
  router,
  publicProcedure,
  protectedProcedure,
  authRateLimit,
  registerRateLimit,
} from "../server.js";

const SESSION_TTL_DAYS = 30;
const CONSUMER_ROLES = ["user", "customer"] as const;

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

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  // Login for consumers (/login page)
  login: publicProcedure
    .use(authRateLimit)
    .input(z.object({ email: emailSchema, password: passwordSchema }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });

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
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      const staffRoles = ["super-admin", "admin", "supervisor", "sales", "support-admin"];
      if (!staffRoles.includes(user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Use the consumer login page." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });

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

      if (isNewUser) {
        await grantCredits(user.id, 1, "welcome");
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
