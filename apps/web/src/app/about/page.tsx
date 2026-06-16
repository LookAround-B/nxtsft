import Link from "next/link";
import type { Metadata } from "next";
import { AboutContent } from "./AboutContent";

export const metadata: Metadata = {
  title: "About NxtSft.com",
  description:
    "NxtSft.com vision, mission and the team building India's smart real estate ecosystem.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <AboutContent />
    </div>
  );
}
