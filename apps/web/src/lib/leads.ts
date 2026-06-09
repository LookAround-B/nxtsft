export type LeadAction =
  | "Schedule Visit"
  | "Request Callback"
  | "Unlock Contact"
  | "WhatsApp"
  | "Get Price";
export type LeadStatus = "new" | "contacted" | "closed";

export interface Lead {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  propertyId: string;
  propertyName: string;
  propertyCity: string;
  action: LeadAction;
  timestamp: string;
  assignedTo: string | null;
  status: LeadStatus;
}

const LEADS_KEY = "nxtsft.leads";

export function captureLead(
  action: LeadAction,
  property: { id: string; title: string; city: string },
  session: { name: string; email: string; phone: string },
): void {
  const existing = getLeads();
  const lead: Lead = {
    id: `L-${Date.now()}`,
    userName: session.name,
    userEmail: session.email,
    userPhone: session.phone,
    propertyId: property.id,
    propertyName: property.title,
    propertyCity: property.city,
    action,
    timestamp: new Date().toISOString(),
    assignedTo: null,
    status: "new",
  };
  existing.unshift(lead);
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(existing));
  } catch {
    /* ignore */
  }
}

export function getLeads(): Lead[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LEADS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function assignLead(id: string, memberName: string): void {
  const list = getLeads();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], assignedTo: memberName, status: "contacted" };
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function updateLeadStatus(id: string, status: LeadStatus): void {
  const list = getLeads();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], status };
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
