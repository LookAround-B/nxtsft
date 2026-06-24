import type { Metadata } from "next";
import { CareersContent } from "./CareersContent";

export const metadata: Metadata = {
  title: "Careers at NxtSft.com — Build the Future of Real Estate",
  description:
    "Join NxtSft.com — India's next-generation real estate platform. Explore opportunities across technology, product, sales, marketing and more.",
};

export default function CareersPage() {
  return <CareersContent />;
}
