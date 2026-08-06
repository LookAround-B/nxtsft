"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { HOME_FOR_ROLE, canAccess, isStaffRoute } from "@/lib/routes";

/**
 * Client-side portal guard — the in-app mirror of the Edge middleware
 * (`src/middleware.ts`). The middleware is the real gate, but it can't see
 * client-only session state, so this prevents a wrong-role flash and bounces
 * the user even if the cookie/session ever drift apart.
 *
 *  - Session not confirmed yet?      → render nothing (return false).
 *  - No session?                     → bounce to the right login.
 *  - Signed in but role not allowed? → bounce to that role's own home.
 *  - Otherwise                       → allowed (return true).
 *
 * Gated on `sessionChecked`, not `loading`: `loading` only covers reading the
 * localStorage cache, so a browser that lost that cache while keeping its
 * session cookie used to be bounced to /login here — where middleware, seeing
 * a perfectly valid cookie, bounced it straight back to the portal. Waiting
 * for the server re-check (which repairs the cache from the cookie) is what
 * breaks that loop.
 */
export function usePortalGuard(): boolean {
  const { session, sessionChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!sessionChecked) return;
    if (!session) {
      router.replace(isStaffRoute(pathname) ? "/admin-login" : "/login");
      return;
    }
    if (!canAccess(session.role, pathname)) {
      router.replace(HOME_FOR_ROLE[session.role]);
    }
  }, [sessionChecked, session, pathname, router]);

  return sessionChecked && !!session && canAccess(session.role, pathname);
}
