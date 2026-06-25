import type { Metadata } from "next";
import { NriShowcase } from "./NriShowcase";

export const metadata: Metadata = {
  title: "Invest, Buy & Rent in India from Abroad — For NRIs | NxtSft.com",
  description:
    "NxtSft.com lets Non-Resident Indians invest, buy and rent property in India entirely online — RERA-verified listings, a dedicated NRI desk, FEMA-ready paperwork and repatriation support. No travel required.",
};

export default function NriShowcasePage() {
  return <NriShowcase />;
}
