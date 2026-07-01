import type { Metadata } from "next";

// Self-canonical collapses filtered variants onto /interiors. The [slug]
// designer pages set their own canonical, which overrides this.
export const metadata: Metadata = {
  title: "Interior Designers & Home Interior Services in India",
  description:
    "Find verified interior designers and home interior studios across India. Compare portfolios, design styles and budgets on NxtSft.com.",
  alternates: { canonical: "/interiors" },
  openGraph: {
    title: "Interior Designers & Home Interior Services in India",
    description:
      "Find verified interior designers and home interior studios across India. Compare portfolios, styles and budgets on NxtSft.com.",
    url: "/interiors",
  },
};

export default function InteriorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
