import type { Metadata } from "next";

// Self-canonical collapses filtered variants onto /pg.
export const metadata: Metadata = {
  title: "PG & Co-living Spaces for Rent in India",
  description:
    "Discover verified PG accommodations and co-living spaces across India — furnished, budget-friendly and amenity-rich. Zero brokerage on NxtSft.com.",
  alternates: { canonical: "/pg" },
  openGraph: {
    title: "PG & Co-living Spaces for Rent in India",
    description:
      "Discover verified PG accommodations and co-living spaces across India — furnished and budget-friendly on NxtSft.com.",
    url: "/pg",
  },
};

export default function PgLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
