import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import prisma from "@nxtsft/db";
import { SITE_URL } from "@/lib/site";
import { jsonLdScript } from "@/lib/jsonLd";
import { getNonce } from "@/lib/nonce";
import InteriorDesignerClient from "./InteriorDesignerClient";

export const runtime = "nodejs";

const getDesigner = cache(async (slug: string) => {
  return prisma.interiorDesigner.findUnique({
    where: { slug },
    select: {
      companyName: true,
      description: true,
      city: true,
      state: true,
      logo: true,
      coverImage: true,
      website: true,
      phone: true,
      yearsExperience: true,
      projectsCompleted: true,
      designStyles: true,
      areasServed: true,
      status: true,
      slug: true,
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const designer = await getDesigner(slug);

  if (!designer || designer.status !== "active") {
    return { title: "Interior designer not found", robots: { index: false, follow: false } };
  }

  const canonical = `/interiors/${designer.slug}`;
  const styles = designer.designStyles?.length ? ` — ${designer.designStyles.slice(0, 3).join(", ")}` : "";

  const title = `${designer.companyName}${designer.city ? `, Interior Designer in ${designer.city}` : ""}`;
  const description =
    designer.description?.trim() ||
    `${designer.companyName} is an interior design studio${
      designer.city ? ` in ${designer.city}` : ""
    }${styles}${
      designer.projectsCompleted ? `, ${designer.projectsCompleted}+ projects completed` : ""
    }. View portfolio, styles & get a quote on NxtSft.com.`;

  const image = designer.coverImage || designer.logo;

  return {
    title,
    description: description.slice(0, 200),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonical,
      type: "website",
      images: image ? [{ url: image, alt: designer.companyName }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function InteriorDesignerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const designer = await getDesigner(slug);
  // Only published (active) designers are public; anything else 404s.
  if (!designer || designer.status !== "active") notFound();

  const url = `${SITE_URL}/interiors/${designer.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HomeAndConstructionBusiness",
        "@id": `${url}#business`,
        name: designer.companyName,
        url,
        ...(designer.description?.trim() ? { description: designer.description.trim() } : {}),
        ...(designer.logo ? { logo: designer.logo } : {}),
        ...(designer.coverImage || designer.logo
          ? { image: designer.coverImage || designer.logo }
          : {}),
        ...(designer.phone ? { telephone: designer.phone } : {}),
        ...(designer.website ? { sameAs: [designer.website] } : {}),
        ...(designer.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: designer.city,
                ...(designer.state ? { addressRegion: designer.state } : {}),
                addressCountry: "IN",
              },
            }
          : {}),
        ...(designer.areasServed?.length ? { areaServed: designer.areasServed } : {}),
        ...(designer.designStyles?.length ? { knowsAbout: designer.designStyles } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Interiors", item: `${SITE_URL}/interiors` },
          { "@type": "ListItem", position: 3, name: designer.companyName, item: url },
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
      <InteriorDesignerClient slug={slug} />
    </>
  );
}
