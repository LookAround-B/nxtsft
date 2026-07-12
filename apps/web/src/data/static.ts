// Small shared constants that are not backed by the database.
// The historical demo fixtures (properties, leads, activities, teamMembers,
// propertyViews, unlockedContacts, disputes, subscriptions, walletLedger, …)
// were removed once every portal moved to live tRPC data. Only the two
// genuinely-static values below remain in use.

export const ownerSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const portals = [
  { name: "NxtSft.com Command", role: "Super Admin", path: "/sa-portal", accent: "Gold" },
  { name: "NxtSft.com Control", role: "Admin", path: "/admin-portal", accent: "Red" },
  { name: "NxtSft.com Desk", role: "Supervisor", path: "/supervisor-portal", accent: "Green" },
  { name: "NxtSft.com Field", role: "Sales Rep", path: "/sales-portal", accent: "Amber" },
  { name: "NxtSft.com Home", role: "End User", path: "/user-portal", accent: "Red" },
];
