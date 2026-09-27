import type { Metadata } from "next";

// Self-canonical collapses filtered variants onto /agents. The [slug] agent
// pages set their own canonical, which overrides this.
export const metadata: Metadata = {
  title: "Verified Property Consultants in India",
  description:
    "Connect with top-rated, verified property consultants across India to buy, sell or rent property. Zero brokerage on NxtSft.com.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "Verified Property Consultants in India",
    description:
      "Connect with top-rated, verified property consultants across India to buy, sell or rent property on NxtSft.com.",
    url: "/agents",
  },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
