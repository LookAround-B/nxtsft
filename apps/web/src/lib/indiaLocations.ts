"use client";
import { useEffect, useState } from "react";

// All Indian states/UTs → their cities and towns (public/data/india-locations.json,
// ~48 KB, generated from the country-state-city dataset with the site's own
// names kept: Kochi, Kadapa, Delhi NCR). Fetched on demand so it isn't bundled
// into every page; the listing form uses it for its State → City pickers.
export type IndiaLocations = Record<string, string[]>;

let cache: Promise<IndiaLocations> | null = null;

function loadIndiaLocations(): Promise<IndiaLocations> {
  cache ??= fetch("/data/india-locations.json")
    .then((r) => {
      if (!r.ok) throw new Error(`india-locations ${r.status}`);
      return r.json() as Promise<IndiaLocations>;
    })
    .catch((err) => {
      cache = null; // let a later mount retry
      throw err;
    });
  return cache;
}

export function useIndiaLocations() {
  const [locations, setLocations] = useState<IndiaLocations | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadIndiaLocations()
      .then((l) => live && setLocations(l))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { locations, failed };
}

/** Find a city by name (case-insensitive) → its canonical spelling and state. */
export function findCity(
  locations: IndiaLocations,
  name: string,
): { state: string; city: string } | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  for (const [state, cities] of Object.entries(locations)) {
    const city = cities.find((c) => c.toLowerCase() === target);
    if (city) return { state, city };
  }
  return undefined;
}
