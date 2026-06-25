"use client";
import { PlansManager } from "@/components/portal/PlansManager";

export function AdminPlansTab() {
  return (
    <PlansManager
      title="Plans Manager"
      subtitle="Add, edit, price and activate pricing plans. Changes go live on the pricing page immediately."
    />
  );
}
