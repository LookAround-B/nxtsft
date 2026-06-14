import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure } from "../server.js";

const SESSION_TTL_DAYS = 30;
const CONSUMER_ROLES = ["user", "customer"] as const;

const googleClient = new OAuth2Client();

// Verify a Google ID token (from the client-side Google button) and return its payload.
async function verifyGoogleCredential(credential: string) {
  const audience = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google sign-in is not configured." });
  }
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    return ticket.getPayload();
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Google sign-in. Please try again." });
  }
}

function generateToken() {
  return randomBytes(32).toString("hex");
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
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        city: z.string().min(2),
      }),
    )
    .mutation(async ({ input }) => {
      const [existingEmail, existingPhone] = await Promise.all([
        prisma.user.findUnique({ where: { email: input.email } }),
        prisma.user.findUnique({ where: { phone: input.phone } }),
      ]);

      if (existingEmail) throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
      if (existingPhone) throw new TRPCError({ code: "CONFLICT", message: "Phone already registered." });

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
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });

      // Grant 3 demo credits on first login if balance is zero (consumer roles only)
      if (CONSUMER_ROLES.includes(user.role as (typeof CONSUMER_ROLES)[number]) && user.credits === 0) {
        await grantCredits(user.id, 3, "demo");
      }

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  // Login for staff roles (/admin-login page)
  loginStaff: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
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
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

      return { token, user: safeUser(user) };
    }),

  // Sign in / sign up with a Google ID token (consumer role: user)
  googleSignIn: publicProcedure
    .input(z.object({ credential: z.string().min(10) }))
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
      } else if (CONSUMER_ROLES.includes(user.role as (typeof CONSUMER_ROLES)[number]) && user.credits === 0) {
        await grantCredits(user.id, 3, "demo");
      }

      const token = generateToken();
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiry() },
      });

      const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { token, user: safeUser(freshUser) };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.token) {
      await prisma.session.deleteMany({ where: { token: ctx.token } });
    }
    return { ok: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return safeUser(ctx.user);
  }),
});
