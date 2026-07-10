"use client";

import { useEffect } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { PressBand } from "@/components/home/PressBand";
import { TrustBand } from "@/components/site/TrustBadges";
import { StatsBand } from "@/components/home/StatsBand";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { KPIBand } from "@/components/home/KPIBand";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { CitiesSection } from "@/components/home/CitiesSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { WhySection } from "@/components/home/WhySection";
import { BannerSection } from "@/components/home/BannerSection";
// import { PortalsSection } from "@/components/home/PortalsSection";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  // Activate scroll-reveal animations for static sections on initial mount.
  // FeaturedProperties runs its own observer to handle dynamically-loaded cards.
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-visible])");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).setAttribute("data-visible", "");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -52px 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#F4F5F7" }}>
      <HeroSection />
      <TrustBand />
      <PressBand />
      <StatsBand />
      <FeaturedProperties />
      <KPIBand />
      <CategoriesSection />
      <ServicesSection />
      <CitiesSection />
      <ReviewsSection />
      <WhySection />
      <BannerSection />
      {/* <PortalsSection /> */}
      <CTASection />
    </div>
  );
}
