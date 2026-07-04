import { NextResponse, type NextRequest } from "next/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@nxtsft/shared";
import {
  HOME_FOR_ROLE,
  canAccess,
  isLoginRoute,
  isPublic,
  isRole,
  isStaffRoute,
} from "@/lib/routes";

/**
 * Site-wide auth + role gate, plus per-request CSP nonce. Access rules live
 * in `src/lib/routes.ts`.
 *
 *  - PUBLIC routes        → always allowed.
 *  - No session           → redirect to the right login (staff → /admin-login).
 *  - Authenticated, role-gated portal not permitted → redirect to own home.
 *  - Authenticated user on a login page → redirect to own home.
 *
 * Static assets and /api are excluded via `config.matcher`; API route handlers
 * enforce their own auth.
 *
 * The `nxtsft_session` cookie is httpOnly and signed server-side (set by
 * /api/auth/session right after login) — client JS can neither read nor forge
 * it, and a tampered value fails signature verification below and is treated
 * as "no session". This is a page-routing convenience gate only; the actual
 * authorization boundary is each protected/staff/admin tRPC procedure, which
 * always re-derives the role fresh from the DB by token (see server.ts) and
 * never trusts this cookie. GOL-268 M1.
 */

// node:crypto (HMAC, randomBytes) needs the Node runtime — Next.js middleware
// supports this since 15.2 (previously Edge-only).
export const runtime = "nodejs";

function roleFromCookie(value: string | undefined) {
  const parsed = verifySessionCookie(value);
  if (!parsed) return null;
  return isRole(parsed.role) ? parsed.role : null;
}

// Hostname of the configured R2 public bucket, so img-src allows listing
// photos — mirrors the same lookup in next.config.ts (kept separate: that one
// runs at build time, this one runs per-request).
const r2Host = (() => {
  try {
    return process.env.CLOUDFLARE_R2_PUBLIC_URL
      ? new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).hostname
      : null;
  } catch {
    return null;
  }
})();
const r2ImgSrc = r2Host ? ` https://${r2Host}` : "";

// Builds the site Content-Security-Policy. script-src keeps 'unsafe-inline':
// a per-request nonce is incompatible with static prerendering — Next only
// injects the nonce into its bootstrap scripts on dynamically-rendered pages,
// so a global nonce CSP blocks the inline scripts on every static page
// (homepage, listings, marketing). The one app-authored inline-script vector,
// the JSON-LD <script> tags on detail pages, is XSS-safe regardless of CSP
// because jsonLdScript() escapes the payload (see src/lib/jsonLd.ts). GOL-268
// H3 is accepted as a Low residual in exchange for keeping static generation.
function buildCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' blob: https://accounts.google.com https://checkout.razorpay.com",
    // Mapbox GL renders tiles in a blob web worker.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.r2.cloudflarecontent.com https://*.r2.dev https://api.mapbox.com https://*.razorpay.com" +
      r2ImgSrc,
    "connect-src 'self' https://accounts.google.com https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.razorpay.com https://lumberjack.razorpay.com",
    // Razorpay checkout renders its payment UI (cards, UPI, 3DS/OTP) in an iframe.
    "frame-src https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com",
    "frame-ancestors 'none'",
  ].join("; ");
}

function nextWithCsp(_request: NextRequest): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", buildCsp());
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = roleFromCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // Already signed in? Keep them out of the login/register pages.
  if (role && isLoginRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_FOR_ROLE[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isPublic(pathname)) return nextWithCsp(request);

  // Protected route, no valid session → bounce to the appropriate login.
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = isStaffRoute(pathname) ? "/admin-login" : "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in but role not permitted on this portal → send to own home.
  if (!canAccess(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_FOR_ROLE[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  return nextWithCsp(request);
}

export const config = {
  matcher: [
    /*
     * Match every route EXCEPT:
     *  - /api            (route handlers do their own auth)
     *  - /_next/static   (build assets)
     *  - /_next/image    (image optimizer)
     *  - common static files (favicon, robots, sitemap, images, fonts)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
