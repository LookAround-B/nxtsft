import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import net from "node:net";
import prisma from "@nxtsft/db";

// Ops probe for "why is production 500ing on every DB-backed route".
//
// Prisma surfaces a connection failure as a bare "timeout exceeded when trying
// to connect", which does not say *which host* it failed to reach — and the
// two candidate causes need opposite fixes:
//   * Vercel's DATABASE_URL points at a host that no longer serves the DB
//     (self-hosted Postgres on a dynamic IP; the local .env drifts ahead).
//   * The host is right but the egress path is blocked (firewall / pg_hba),
//     which shows up as a TCP connect that times out rather than refuses.
// So this reports the target it is actually configured with plus a raw TCP
// timing, which separates the two in a single request.
//
// Requires `Authorization: Bearer $CRON_SECRET`, reusing the cron-route
// convention. With CRON_SECRET unset the route is disabled; it never falls
// open — the response names the DB host, which is not public information.

export const dynamic = "force-dynamic";

const TCP_TIMEOUT_MS = 5_000;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Host/port/db/user only — never the password, and never the raw URL, since
// this response is meant to be pasted into a chat or a ticket.
function describeTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { configured: false as const };
  try {
    const u = new URL(raw);
    return {
      configured: true as const,
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, ""),
      user: u.username,
      params: u.search.replace(/^\?/, ""),
    };
  } catch {
    return { configured: true as const, parseError: "DATABASE_URL is not a valid URL" };
  }
}

// A plain TCP connect, outside Prisma and outside TLS. Distinguishes a dropped
// SYN (firewall: hangs to the timeout) from a refused one (nothing listening:
// fails fast) from a healthy socket (so the failure is in TLS/auth instead).
function probeTcp(host: string, port: number): Promise<{ ok: boolean; ms: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean, error?: string) => {
      socket.destroy();
      resolve({ ok, ms: Date.now() - start, error });
    };
    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false, "timeout (SYN dropped — firewall or wrong host)"));
    socket.once("error", (err: Error) => done(false, err.message));
    socket.connect(port, host);
  });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = describeTarget();
  if (!target.configured) {
    return NextResponse.json({ ok: false, target, error: "DATABASE_URL is not set" }, { status: 500 });
  }

  const tcp = target.host ? await probeTcp(target.host, Number(target.port)) : null;

  const start = Date.now();
  let query: { ok: boolean; ms: number; error?: string };
  try {
    await prisma.$queryRaw`SELECT 1`;
    query = { ok: true, ms: Date.now() - start };
  } catch (err) {
    query = { ok: false, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(
    { ok: query.ok, target, tcp, query },
    { status: query.ok ? 200 : 503 },
  );
}
