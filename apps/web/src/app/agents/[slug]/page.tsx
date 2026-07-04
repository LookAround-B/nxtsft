import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import prisma from "@nxtsft/db";
import { SITE_URL } from "@/lib/site";
import { jsonLdScript } from "@/lib/jsonLd";
import { getNonce } from "@/lib/nonce";
import AgentProfileClient from "./AgentProfileClient";

export const runtime = "nodejs";

const getAgent = cache(async (slug: string) => {
  return prisma.user.findFirst({
    where: { slug, role: "agent" },
    select: {
      name: true,
      slug: true,
      city: true,
      state: true,
      bio: true,
      avatar: true,
      verified: true,
      metadata: true,
    },
  });
});

type AgentMeta = {
  rating?: number;
  reviews?: number;
  deals?: number;
  since?: number;
  portfolioValue?: string;
  specialties?: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);

  if (!agent) {
    return { title: "Agent not found", robots: { index: false, follow: false } };
  }

  const meta = (agent.metadata ?? {}) as AgentMeta;
  const canonical = `/agents/${agent.slug}`;
  const specialties = meta.specialties?.length ? ` — ${meta.specialties.slice(0, 2).join(", ")}` : "";

  const title = `${agent.name}${agent.city ? `, Real Estate Agent in ${agent.city}` : ", Real Estate Agent"}`;
  const description =
    agent.bio?.trim() ||
    `${agent.name} is a ${agent.verified ? "verified " : ""}real estate agent${
      agent.city ? ` in ${agent.city}` : ""
    }${specialties}${
      meta.deals ? `, ${meta.deals}+ deals closed` : ""
    }. Connect on NxtSft.com to buy, sell or rent property.`;

  return {
    title,
    description: description.slice(0, 200),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonical,
      type: "profile",
      images: agent.avatar ? [{ url: agent.avatar, alt: agent.name }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description: description.slice(0, 200),
      images: agent.avatar ? [agent.avatar] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const meta = (agent.metadata ?? {}) as AgentMeta;
  const url = `${SITE_URL}/agents/${agent.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": `${url}#agent`,
        name: agent.name,
        url,
        ...(agent.avatar ? { image: agent.avatar } : {}),
        ...(agent.bio?.trim() ? { description: agent.bio.trim() } : {}),
        ...(agent.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: agent.city,
                ...(agent.state ? { addressRegion: agent.state } : {}),
                addressCountry: "IN",
              },
              areaServed: agent.city,
            }
          : {}),
        ...(meta.specialties?.length ? { knowsAbout: meta.specialties } : {}),
        ...(meta.rating && meta.reviews
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: meta.rating,
                reviewCount: meta.reviews,
                bestRating: 5,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Agents", item: `${SITE_URL}/agents` },
          { "@type": "ListItem", position: 3, name: agent.name, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={await getNonce()}
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <AgentProfileClient />
    </>
  );
}
