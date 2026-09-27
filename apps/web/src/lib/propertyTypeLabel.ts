// Listings store commercial property as type "Office" (filters, URLs and the
// DB all use it); people should see "Commercial", as the header and home tabs
// already say.
const LABELS: Record<string, string> = { Office: "Commercial" };

export function typeLabel(type: string): string {
  return LABELS[type] ?? type;
}
