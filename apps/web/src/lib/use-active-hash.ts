"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function useActiveHash(): string {
  const [hash, setHash] = useState("");
  // Subscribes this hook to router navigations — see the second effect below.
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const read = () => window.location.hash.replace(/^#/, "");
    // Sync on mount so direct URL loads (e.g. /admin-portal#team) work
    setHash(read());

    const onHashChange = () => setHash(read());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  // The listeners above cover native fragment navigation (PortalShell's nav
  // assigns window.location.hash directly) and back/forward. They do NOT cover
  // a next/link that changes the query as well as the fragment — e.g. My
  // Listings' "View Leads →" pointing at /user-portal?propertyId=X#leads.
  // That is a soft navigation via history.pushState, which fires neither
  // hashchange nor popstate, so the portal kept rendering the previous tab.
  // Reading pathname/search subscribes this hook to the router, so it re-runs
  // on those navigations; pushState updates the URL first, so the hash read
  // here is the new one.
  useEffect(() => {
    setHash(window.location.hash.replace(/^#/, ""));
  }, [pathname, search]);

  return hash;
}
