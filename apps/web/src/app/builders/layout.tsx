import type { Metadata } from "next";

// Self-canonical collapses filtered variants onto /builders. The [slug] builder
// pages set their own canonical, which overrides this.
export const metadata: Metadata = {
  title: "Real Estate Builders & Developers in India",
  description:
    "Explore top RERA-registered builders and developers across India — projects, RERA details and verified contact information on NxtSft.com.",
  alternates: { canonical: "/builders" },
  openGraph: {
    title: "Real Estate Builders & Developers in India",
    description:
      "Explore top RERA-registered builders and developers across India — projects, RERA details and verified contacts on NxtSft.com.",
    url: "/builders",
  },
};

export default function BuildersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
