import { NextResponse } from "next/server";
import { createContextFromToken } from "@nxtsft/trpc/server";
import { signSessionCookie, SESSION_COOKIE_NAME } from "@nxtsft/shared";

// Node runtime: signSessionCookie uses node:crypto (HMAC), and this route
// also needs the Prisma-backed createContextFromToken.
export const runtime = "nodejs";

const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // mirrors SESSION_TTL_DAYS in auth.ts

// Called right after a successful auth.{login,loginStaff,googleSignIn,register}
// mutation. Re-verifies the token against the DB itself (never trusts a
// client-supplied role) and sets the signed, httpOnly session cookie that
// middleware and the tRPC context both read from. GOL-268 H2 + M1.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { user } = await createContextFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, signSessionCookie(token, user.role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

// Called on sign-out to clear the cookie server-side (client JS can't touch
// an httpOnly cookie directly).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
