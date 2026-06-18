import { NextResponse, type NextRequest } from "next/server";
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
 */

/** Cookie format: "token|role". Returns the role segment, validated. */
function roleFromCookie(value: string | undefined) {
  if (!value) return null;
  const sep = value.lastIndexOf("|");
  if (sep === -1) return null;
  const role = value.slice(sep + 1);
  return isRole(role) ? role : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = roleFromCookie(request.cookies.get("nxtsft_session")?.value);

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
