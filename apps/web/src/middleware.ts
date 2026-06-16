import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate for the whole site.
 *
 * Rule: any authenticated user may access any page. An unauthenticated visitor
 * is redirected to /login (staff portals redirect to /admin-login instead).
 *
 * Only the pages in PUBLIC_ROUTES are reachable without a session — everything
 * else requires login. Static assets and /api are excluded via `config.matcher`.
 */
const PUBLIC_ROUTES = ["/login", "/admin-login", "/register"];

/** Staff portals send unauthenticated users to /admin-login instead of /login */
const STAFF_PREFIXES = [
  "/sa-portal",
  "/admin-portal",
  "/supervisor-portal",
  "/sales-portal",
  "/support-portal",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isStaffRoute(pathname: string): boolean {
  return STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth pages are always reachable (otherwise we'd loop on the redirect).
  if (isPublic(pathname)) return NextResponse.next();

  // Cookie format: "token|role"
  const cookie = request.cookies.get("nxtsft_session")?.value;
  const hasSession = !!cookie && cookie.lastIndexOf("|") !== -1;

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = isStaffRoute(pathname) ? "/admin-login" : "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated — allow access to every page.
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
