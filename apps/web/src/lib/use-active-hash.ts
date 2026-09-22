"use client";
import { useEffect, useState } from "react";

export function useActiveHash(): string {
  const [hash, setHash] = useState("");

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
  // hashchange nor popstate, so the portal would keep rendering the previous
  // tab. pushState updates the URL before React re-renders, so re-reading on
  // every render catches it; setHash bails on an unchanged value, so this
  // settles immediately rather than looping.
  useEffect(() => {
    setHash(window.location.hash.replace(/^#/, ""));
  });

  return hash;
}
