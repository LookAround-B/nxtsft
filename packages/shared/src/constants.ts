export const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  SALES: "sales",
  SUPPORT_ADMIN: "support-admin",
  USER: "user",
  CUSTOMER: "customer",
} as const;

export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Plot",
  "Commercial",
  "PG",
  "New",
  "Studio",
] as const;

export const CITIES = [
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
] as const;

export const CACHE_KEYS = {
  PROPERTY_LIST: "properties:",
  PROPERTY_DETAIL: "property:",
  AGENT_LIST: "agents:",
  SEARCH_RESULTS: "search:",
  USER_SESSION: "session:",
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

export const RATE_LIMITS = {
  SEARCH: { points: 1, duration: "1 minute" },
  CONTACT_AGENT: { points: 5, duration: "1 hour" },
  API_GENERAL: { points: 100, duration: "1 hour" },
} as const;
