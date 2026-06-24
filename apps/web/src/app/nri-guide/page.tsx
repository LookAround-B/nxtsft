import type { Metadata } from "next";
import { NriGuideContent } from "./NriGuideContent";

export const metadata: Metadata = {
  title: "NRI Guide to Investing in Indian Real Estate | NxtSft.com",
  description:
    "Complete guide for NRIs investing in Indian real estate — FEMA rules, tax insights, RERA compliance, home loans, and repatriation limits. Curated by NxtSft.com",
};

export default function NriGuidePage() {
  return <NriGuideContent />;
}
