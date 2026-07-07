// Shared types and constants used across multiple admin-portal tabs.
// JSX components live in PageHead.tsx to keep this file JSX-free.

// Live "needs action" counts per queue (admin.badgeCounts) — drives the
// sidebar badge bubbles in both the admin and super-admin portals.
export type BadgeCounts = {
  enquiries: number;
  kyc: number;
  sellerApprovals: number;
  listings: number;
  reviews: number;
  interiors: number;
  decor: number;
  escalations: number;
};

export type NewMemberInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "supervisor" | "sales" | "support-admin";
  city: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  verified: boolean;
  active: boolean;
  joined: string;
  supervisorId?: string | null;
  supervisor?: { id: string; name: string } | null;
};

export const ROLE_LABEL: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  supervisor: "Supervisor",
  sales: "Sales Rep",
  "support-admin": "Support Admin",
};
