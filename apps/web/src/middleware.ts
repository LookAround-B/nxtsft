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
 * Site-wide auth + role gate. Access rules live in `src/lib/routes.ts`.
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

// node:crypto (HMAC) needs the Node runtime — Next.js middleware supports
// this since 15.2 (previously Edge-only).
export const runtime = "nodejs";

function roleFromCookie(value: string | undefined) {
  const parsed = verifySessionCookie(value);
  if (!parsed) return null;
  return isRole(parsed.role) ? parsed.role : null;
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

  if (isPublic(pathname)) return NextResponse.next();

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

  return NextResponse.next();
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
