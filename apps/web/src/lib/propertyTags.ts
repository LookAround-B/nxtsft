// Badge colour for each marketing tag (Property.tags). Kept in one place so the
// browse cards and the detail page render tags identically. The allowed set
// itself lives in @nxtsft/shared (PROPERTY_TAGS).
export const TAG_BADGE_CLASS: Record<string, string> = {
  Gold: "bg-amber-500",
  Silver: "bg-slate-400",
  Premium: "bg-violet-600",
  Urgent: "bg-red-600",
  Sold: "bg-gray-700",
  "Under Negotiation": "bg-orange-500",
};

export function tagClass(tag: string): string {
  return TAG_BADGE_CLASS[tag] ?? "bg-navy";
}
