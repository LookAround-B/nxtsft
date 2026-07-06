/**
 * Plot-area unit conversions. The app stores every area as sqft (canonical) —
 * these helpers convert to/from the seller-facing units at the UI boundary.
 */
export type AreaUnit = "sqft" | "sqyd" | "acre";

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: "sqft", label: "Sq.Ft" },
  { value: "sqyd", label: "Sq.Yards" },
  { value: "acre", label: "Acres" },
];

const SQFT_PER: Record<AreaUnit, number> = {
  sqft: 1,
  sqyd: 9,
  acre: 43_560,
};

export function toSqft(value: number, unit: AreaUnit): number {
  return Math.round(value * SQFT_PER[unit]);
}

export function fromSqft(sqft: number, unit: AreaUnit): number {
  return sqft / SQFT_PER[unit];
}

/** Trim to at most `dp` decimals without trailing zeros ("2.50" → "2.5"). */
function trim(n: number, dp: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: dp });
}

/** Human label for a converted value, e.g. formatArea(21780, "acre") → "0.5 Acres". */
export function formatArea(sqft: number, unit: AreaUnit): string {
  const v = fromSqft(sqft, unit);
  switch (unit) {
    case "sqft":
      return `${trim(v, 0)} sq.ft`;
    case "sqyd":
      return `${trim(v, 1)} sq.yd`;
    case "acre":
      return `${trim(v, 3)} acres`;
  }
}

/**
 * Editable input value for a stored sqft area in the given unit. Precise enough
 * (6 dp for acres, 2 dp for sq.yd) that converting back to sqft round-trips
 * without drift.
 */
export function editValue(sqft: number, unit: AreaUnit): string {
  const v = fromSqft(sqft, unit);
  const dp = unit === "acre" ? 6 : unit === "sqyd" ? 2 : 0;
  return String(Number(v.toFixed(dp)));
}

/**
 * Equivalents line shown under a plot-area input, e.g. entering 2400 sq.ft
 * gives "≈ 266.7 sq.yd · 0.055 acres" (the entered unit is skipped).
 */
export function areaEquivalents(value: number, unit: AreaUnit): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const sqft = value * SQFT_PER[unit];
  const others = AREA_UNITS.filter((u) => u.value !== unit);
  return `≈ ${others.map((u) => formatArea(sqft, u.value)).join(" · ")}`;
}
