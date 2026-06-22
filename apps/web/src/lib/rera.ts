const CITY_STATE: Record<string, string> = {
  Mumbai: "Maharashtra",
  Pune: "Maharashtra",
  Bengaluru: "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
  "Delhi NCR": "Delhi",
  Noida: "Uttar Pradesh",
  Gurgaon: "Haryana",
  Ahmedabad: "Gujarat",
  Surat: "Gujarat",
  Kolkata: "West Bengal",
  Kochi: "Kerala",
  Jaipur: "Rajasthan",
  Lucknow: "Uttar Pradesh",
};

const STATE_PATTERNS: Record<string, RegExp> = {
  Maharashtra: /^P\d{11}$/,
  Karnataka: /^PRM\/KA\/RERA\//i,
  Telangana: /^P024\d{8}$/,
  Delhi: /^DLRERA\d{4}[A-Z]\d{4}$/,
  "Uttar Pradesh": /^UPRERAPRJ\d{7}$/,
  Haryana: /^GGM\//i,
  "Tamil Nadu": /^TN\/29\//i,
  "West Bengal": /^WBRERA\//i,
  Rajasthan: /^RAJ\//i,
  Kerala: /^K-RERA\//i,
  Gujarat: /^PR\/GJ\//i,
  "Andhra Pradesh": /^AP\//i,
};

const FALLBACK = /^[A-Za-z0-9\/\-]+$/;

export function validateRera(rera: string, city: string): string | null {
  const trimmed = rera.trim();
  if (!trimmed) return "RERA registration number is required";
  const state = CITY_STATE[city] ?? "";
  const pattern = STATE_PATTERNS[state] ?? FALLBACK;
  if (!pattern.test(trimmed)) {
    return state && STATE_PATTERNS[state]
      ? `Invalid RERA format for ${state}. Check your state RERA portal for the correct format.`
      : "Invalid RERA registration number format";
  }
  return null;
}
