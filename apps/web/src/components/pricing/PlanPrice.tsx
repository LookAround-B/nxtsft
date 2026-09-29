// Plan price with an optional MRP (boss 09-29): when admin sets an MRP above
// the offer price, show ~~MRP~~ + offer price + "X% OFF". The customer is
// always charged the offer price (Plan.price); MRP is display-only.
export function PlanPrice({ price, priceLabel, mrp }: { price: number; priceLabel: string; mrp?: number | null }) {
  const discounted = typeof mrp === "number" && mrp > price;
  const pct = discounted ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {discounted && (
        <span className="text-base font-semibold text-muted-foreground line-through">
          ₹{mrp.toLocaleString("en-IN")}
        </span>
      )}
      <span className="font-display text-3xl font-black text-navy">{priceLabel}</span>
      {discounted && pct > 0 && (
        <span className="self-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          {pct}% OFF
        </span>
      )}
    </span>
  );
}
