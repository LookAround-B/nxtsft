// "Auto-generate" for the listing description (boss 09-28): tidy what the
// seller typed and add a full, well-formatted write-up built ONLY from the
// details already entered on the form, so nothing is invented. No AI.

export type DescribeInput = {
  listerType: string;
  propertyType: string;
  purpose: "Sale" | "Rent";
  state: string;
  city: string;
  locality: string;
  price: string;
  area: string;
  areaUnit: "sqft" | "sqyd" | "acre";
  builtUpArea: string;
  bhk: string;
  description: string;
  amenities: string[];
  rera: string;
  reraLabel: string;
  possession: string;
};

const UNIT_LABEL = { sqft: "sq ft", sqyd: "sq yards", acre: "acres" } as const;
const HIGHLIGHTS = "Property highlights:";
const AMENITIES = "Amenities:";
const INTRO_RE = /^(A|An) .+ (available )?for (sale|rent) in .+\.$/;

const num = (s: string) => {
  const n = Number(String(s).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function rupees(n: number): string {
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Clean up free text: spacing, blank lines, bullets, sentence capitals. */
export function formatDescription(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) =>
      l
        .replace(/[ \t ]+/g, " ")
        .trim()
        .replace(/\s+([,.;:!?])/g, "$1") // no space before punctuation
        .replace(/([,;:!?])(?=[A-Za-z])/g, "$1 ") // one space after (not inside numbers / times)
        // "painted.good" → "painted. good", but leave web addresses (www.nxtsft.com) alone
        .split(" ")
        .map((tok) =>
          /(www\.|https?:|@|\.(com|in|org|net|co|io)\b)/i.test(tok)
            ? tok
            : tok.replace(/([A-Za-z])\.(?=[A-Za-z]{2,})/g, "$1. "),
        )
        .join(" ")
        .replace(/([!?])\1+/g, "$1")
        .replace(/,{2,}/g, ",")
        .replace(/^[-*•·]\s*/, "• ")
        // capital letter after a sentence end
        .replace(/([.!?]\s+)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase()),
    )
    .map((l) => (l.startsWith("• ") ? "• " + cap(l.slice(2)) : cap(l)));

  const out: string[] = [];
  for (const l of lines) {
    if (l === "" && (out.length === 0 || out[out.length - 1] === "")) continue; // collapse blank lines
    if (l !== "" && l === out[out.length - 1]) continue; // drop repeated line
    out.push(l);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

/** Remove a previously generated intro + highlights so re-clicking never duplicates. */
function stripGenerated(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const cut = lines.findIndex((l) => l.trim() === HIGHLIGHTS || l.trim() === AMENITIES);
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !INTRO_RE.test(l.trim()));
  return kept.join("\n");
}

/** Build the full description from the form's own details + the seller's text. */
export function generateDescription(d: DescribeInput): string {
  const typeLabel = d.propertyType === "PG / Co-living" ? "PG / co-living space" : d.propertyType.toLowerCase();
  const what = [d.bhk && d.propertyType !== "Plot" ? d.bhk : "", typeLabel].filter(Boolean).join(" ");
  const where = [d.locality, d.city, d.state].map((s) => s.trim()).filter(Boolean).join(", ");
  const article = /^[aeiou]/i.test(what) ? "An" : "A";
  const intro = what && where ? `${article} ${what} available for ${d.purpose === "Rent" ? "rent" : "sale"} in ${where}.` : "";

  const area = num(d.area);
  const built = num(d.builtUpArea);
  const price = num(d.price);
  const facts: string[] = [];
  if (what) facts.push(`• Type: ${cap(what)}`);
  if (where) facts.push(`• Location: ${where}`);
  if (area) {
    facts.push(
      `• Area: ${area.toLocaleString("en-IN")} ${UNIT_LABEL[d.areaUnit] ?? d.areaUnit}` +
        (built ? ` (built-up ${built.toLocaleString("en-IN")} sq ft)` : ""),
    );
  }
  if (price) facts.push(`• ${d.purpose === "Rent" ? "Rent" : "Price"}: ${rupees(price)}${d.purpose === "Rent" ? " per month" : ""}`);
  if (d.possession.trim()) facts.push(`• Possession: ${d.possession.trim()}`);
  if (d.rera.trim()) facts.push(`• ${d.reraLabel || "RERA"}: ${d.rera.trim()}`);
  if (d.listerType) facts.push(`• Listed by: ${cap(d.listerType)}`);

  const own = formatDescription(stripGenerated(d.description));
  const parts: string[] = [];
  if (intro) parts.push(intro);
  if (own) parts.push(own);
  if (facts.length) parts.push([HIGHLIGHTS, ...facts].join("\n"));
  if (d.amenities.length) parts.push([AMENITIES, ...d.amenities.map((a) => `• ${a}`)].join("\n"));
  return parts.join("\n\n");
}
