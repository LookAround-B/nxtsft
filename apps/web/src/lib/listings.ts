export type ListerType = "owner" | "agent" | "builder";
export type ListingStatus = "pending" | "approved" | "rejected";

export interface PendingListing {
  id: string;
  listerType: ListerType;
  propertyType: string;
  purpose: "Sale" | "Rent";
  city: string;
  locality: string;
  price: string;
  area: string;
  bhk: string;
  title: string;
  description: string;
  amenities: string[];
  images: string[];
  rera: string;
  possession: string;
  listerName: string;
  listerEmail: string;
  listerPhone: string;
  submittedAt: string;
  status: ListingStatus;
}

const KEY = "nxtsft.pending_listings";

export function submitListing(
  data: Omit<PendingListing, "id" | "submittedAt" | "status">,
): PendingListing {
  const listing: PendingListing = {
    ...data,
    id: `PL-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  const existing = getPendingListings();
  existing.unshift(listing);
  try {
    localStorage.setItem(KEY, JSON.stringify(existing));
  } catch {
    /* ignore */
  }
  return listing;
}

export function getPendingListings(): PendingListing[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateListingStatus(id: string, status: ListingStatus): void {
  const list = getPendingListings();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], status };
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
