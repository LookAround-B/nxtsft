"use client";

import { trpc } from "@/lib/trpc";

// "Buy credits from ₹99" with the price read live from the cheapest active
// buyer plan (subscriptions.plans orders by price asc). Falls back to plain
// "Buy credits" while loading or if no plans are active.
export function BuyCreditsLabel() {
  const plansQ = trpc.subscriptions.plans.useQuery({ type: "seeker" });
  const cheapest = plansQ.data?.[0];
  return <>{cheapest ? `Buy credits from ${cheapest.priceLabel}` : "Buy credits"}</>;
}
