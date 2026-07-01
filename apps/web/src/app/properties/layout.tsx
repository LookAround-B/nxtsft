import type { Metadata } from "next";

// Server layout supplies metadata for the client-rendered listing hub. The
// self-canonical collapses every filtered variant (/properties?city=…&type=…)
// onto the clean URL so faceted navigation isn't indexed as duplicate content.
// The [slug] detail pages set their own canonical, which overrides this.
export const metadata: Metadata = {
  title: "Properties for Sale & Rent in India",
  description:
    "Browse verified apartments, villas, plots, PGs and commercial properties across India. Zero brokerage, RERA-verified listings, AI-matched to your needs on NxtSft.com.",
  alternates: { canonical: "/properties" },
  openGraph: {
    title: "Properties for Sale & Rent in India",
    description:
      "Browse verified apartments, villas, plots, PGs and commercial properties across India. Zero brokerage, RERA-verified listings on NxtSft.com.",
    url: "/properties",
  },
};

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
