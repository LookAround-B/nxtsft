/**
 * Single source of truth for route access control.
 *
 * Consumed by the Edge middleware (`src/middleware.ts`) — keep this module free
 * of client-only / Node-only imports so it stays edge-safe.
 *
 * Access tiers:
 *  - PUBLIC      reachable without a session (marketing, listings, auth pages)
 *  - PROTECTED   any authenticated user (own profile, list-a-property)
 *  - ROLE-GATED  a portal restricted to specific roles (see PORTAL_ACCESS)
 *
 * Anything not matched by PUBLIC_ROUTES or PORTAL_ACCESS defaults to PROTECTED.
 */

export type Role =
  | "super-admin"
  | "admin"
  | "supervisor"
  | "sales"
  | "support-admin"
  | "user"
  | "home-seller";

export const ROLES: readonly Role[] = [
  "super-admin",
  "admin",
  "supervisor",
  "sales",
  "support-admin",
  "user",
  "home-seller",
];

/** Login pages — never gate these or the redirect loops. */
export const LOGIN_ROUTES = ["/login", "/admin-login", "/register"] as const;

/** Reachable without a session. Marketing + public listings + auth pages. */
export const PUBLIC_ROUTES: readonly string[] = [
  ...LOGIN_ROUTES,
  "/",
  "/properties",
  "/agents",
  "/owners",
  "/pricing",
  "/about",
  "/contact",
  "/refer",
  "/terms",
  "/privacy",
  "/refund",
  "/cookie-policy",
  "/fraud-advisory",
  "/payment",
];

/**
 * Portal prefix → roles allowed to enter it.
 * super-admin is intentionally granted every staff portal.
 */
export const PORTAL_ACCESS: Record<string, readonly Role[]> = {
  "/sa-portal": ["super-admin"],
  "/admin-portal": ["super-admin", "admin"],
  "/supervisor-portal": ["super-admin", "supervisor"],
  "/sales-portal": ["super-admin", "sales"],
  "/support-portal": ["super-admin", "support-admin"],
  "/user-portal": ["user", "home-seller"],
};

/** Where each role lands after login / when bounced off a forbidden portal. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  "super-admin": "/sa-portal",
  admin: "/admin-portal",
  supervisor: "/supervisor-portal",
  sales: "/sales-portal",
  "support-admin": "/support-portal",
  user: "/user-portal",
  "home-seller": "/user-portal",
};

/** Staff roles use /admin-login; consumer roles use /login. */
export const STAFF_ROLES: readonly Role[] = [
  "super-admin",
  "admin",
  "supervisor",
  "sales",
  "support-admin",
];

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => matches(pathname, p));
}

export function isLoginRoute(pathname: string): boolean {
  return LOGIN_ROUTES.some((p) => matches(pathname, p));
}

/** Returns the matched portal prefix, or null if the path isn't a portal. */
export function portalPrefixFor(pathname: string): string | null {
  return Object.keys(PORTAL_ACCESS).find((p) => matches(pathname, p)) ?? null;
}

export function isStaffRoute(pathname: string): boolean {
  const prefix = portalPrefixFor(pathname);
  if (!prefix) return false;
  return PORTAL_ACCESS[prefix].some((r) => STAFF_ROLES.includes(r));
}

export function canAccess(role: Role, pathname: string): boolean {
  const prefix = portalPrefixFor(pathname);
  if (!prefix) return true; // protected-but-not-role-gated → any authenticated user
  return PORTAL_ACCESS[prefix].includes(role);
}

export function isRole(value: string | undefined | null): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}
