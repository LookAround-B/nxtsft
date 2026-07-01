import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import prisma from "@nxtsft/db";
import { SITE_URL } from "@/lib/site";
import PropertyDetailClient from "./PropertyDetailClient";

export const runtime = "nodejs";

// Read-only fetch for metadata + JSON-LD. Deliberately NOT the tRPC `get`
// procedure — that one increments the view counter, which must not fire for a
// crawler/metadata pass. cache() dedupes the query across generateMetadata and
// the page render within a single request.
const getProperty = cache(async (slug: string) => {
  return prisma.property.findFirst({
    where: { slug, deletedAt: null },
    select: {
      title: true,
      description: true,
      type: true,
      purpose: true,
      status: true,
      price: true,
      area: true,
      bedrooms: true,
      bathrooms: true,
      bhk: true,
      rera: true,
      slug: true,
      images: true,
      createdAt: true,
      location: { select: { city: true, state: true, locality: true } },
    },
  });
});

function formatPrice(price: number): string {
  if (price >= 1_00_00_000) return `₹${(price / 1_00_00_000).toFixed(2)} Cr`;
  if (price >= 1_00_000) return `₹${(price / 1_00_000).toFixed(1)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

// Property type → the nearest valid schema.org accommodation type.
const SCHEMA_TYPE: Record<string, string> = {
  Apartment: "Apartment",
  Studio: "Apartment",
  Villa: "House",
  Bungalow: "House",
  PG: "Accommodation",
  Office: "Place",
  Plot: "Place",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property) {
    return { title: "Property not found", robots: { index: false, follow: false } };
  }

  const price = Number(property.price);
  const loc = property.location;
  const place = loc ? [loc.locality, loc.city].filter(Boolean).join(", ") : "";
  const canonical = `/properties/${property.slug}`;

  const title = `${property.title} — ${formatPrice(price)}`;
  const description =
    property.description?.trim() ||
    `${property.bhk ? `${property.bhk} ` : ""}${property.type} for ${property.purpose} ${
      place ? `in ${place}` : ""
    } at ${formatPrice(price)}. ${property.area} sqft${
      property.rera ? `, RERA ${property.rera}` : ""
    }. View photos, amenities & contact the owner on NxtSft.com.`;

  const image = property.images?.[0];

  return {
    title,
    description: description.slice(0, 200),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonical,
      type: "website",
      images: image ? [{ url: image, width: 1200, height: 630, alt: property.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
      images: image ? [image] : undefined,
    },
    // Only Active listings should be indexable; sold/inactive get noindex.
    robots:
      property.status === "Active"
        ? { index: true, follow: true }
        : { index: false, follow: true },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const price = Number(property.price);
  const url = `${SITE_URL}/properties/${property.slug}`;
  const loc = property.location;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateListing",
        "@id": `${url}#listing`,
        url,
        name: property.title,
        description: property.description?.trim() || property.title,
        datePosted: property.createdAt.toISOString(),
        ...(property.images?.length ? { image: property.images } : {}),
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price,
          availability: "https://schema.org/InStock",
          url,
        },
        about: {
          "@type": SCHEMA_TYPE[property.type] ?? "Accommodation",
          name: property.title,
          ...(property.bedrooms > 0 ? { numberOfRooms: property.bedrooms } : {}),
          ...(property.bathrooms > 0 ? { numberOfBathroomsTotal: property.bathrooms } : {}),
          floorSize: { "@type": "QuantitativeValue", value: property.area, unitCode: "FTK" },
          ...(loc
            ? {
                address: {
                  "@type": "PostalAddress",
                  ...(loc.locality ? { streetAddress: loc.locality } : {}),
                  addressLocality: loc.city,
                  addressRegion: loc.state,
                  addressCountry: "IN",
                },
              }
            : {}),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Properties", item: `${SITE_URL}/properties` },
          { "@type": "ListItem", position: 3, name: property.title, item: url },
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
      <PropertyDetailClient slug={slug} />
    </>
  );
}
