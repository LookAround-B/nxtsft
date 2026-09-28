import type { Metadata } from "next";

// Self-canonical collapses filtered variants onto /agents. The [slug] agent
// pages set their own canonical, which overrides this.
export const metadata: Metadata = {
  title: "Virtual Property Consultants & Agents in India",
  description:
    "Talk to NxtSft's virtual property consultants or connect with independent property agents across India to buy, sell or rent property.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "Virtual Property Consultants & Agents in India",
    description:
      "Connect with NxtSft's virtual property consultants across India to buy, sell or rent property on NxtSft.com.",
    url: "/agents",
  },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
