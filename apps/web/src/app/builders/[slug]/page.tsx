import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import prisma from "@nxtsft/db";
import BuilderProfileClient from "./BuilderProfileClient";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nxtsft.com";

const getBuilder = cache(async (slug: string) => {
  return prisma.builder.findUnique({
    where: { slug },
    select: {
      companyName: true,
      description: true,
      city: true,
      state: true,
      district: true,
      website: true,
      logo: true,
      established: true,
      verified: true,
      slug: true,
      _count: { select: { projects: true } },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const builder = await getBuilder(slug);

  if (!builder) {
    return { title: "Builder not found", robots: { index: false, follow: false } };
  }

  const place = [builder.city, builder.state].filter(Boolean).join(", ");
  const projectCount = builder._count.projects;
  const canonical = `/builders/${builder.slug}`;

  const title = `${builder.companyName}${place ? ` — Builder in ${place}` : ""}`;
  const description =
    builder.description?.trim() ||
    `${builder.companyName} is a ${builder.verified ? "RERA-verified " : ""}real estate developer${
      place ? ` in ${place}` : ""
    }${projectCount ? ` with ${projectCount} project${projectCount === 1 ? "" : "s"}` : ""}. Explore projects, RERA details & contact on NxtSft.com.`;

  return {
    title,
    description: description.slice(0, 200),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonical,
      type: "website",
      images: builder.logo ? [{ url: builder.logo, alt: builder.companyName }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description: description.slice(0, 200),
      images: builder.logo ? [builder.logo] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const builder = await getBuilder(slug);
  if (!builder) notFound();

  const url = `${SITE_URL}/builders/${builder.slug}`;
  const region = [builder.city, builder.district, builder.state].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: builder.companyName,
        url,
        description: builder.description?.trim() || `${builder.companyName} — real estate developer`,
        ...(builder.logo ? { logo: builder.logo } : {}),
        ...(builder.website ? { sameAs: [builder.website] } : {}),
        ...(builder.established ? { foundingDate: String(builder.established) } : {}),
        ...(builder.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: builder.city,
                ...(builder.state ? { addressRegion: builder.state } : {}),
                addressCountry: "IN",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Builders", item: `${SITE_URL}/builders` },
          { "@type": "ListItem", position: 3, name: builder.companyName, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BuilderProfileClient slug={slug} />
    </>
  );
}
