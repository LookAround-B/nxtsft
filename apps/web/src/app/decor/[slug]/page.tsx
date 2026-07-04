import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import prisma from "@nxtsft/db";
import { SITE_URL } from "@/lib/site";
import { jsonLdScript } from "@/lib/jsonLd";
import { getNonce } from "@/lib/nonce";
import DecorStoreClient from "./DecorStoreClient";

export const runtime = "nodejs";

const getStore = cache(async (slug: string) => {
  return prisma.decorStore.findUnique({
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
      decorCategories: true,
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
  const store = await getStore(slug);

  if (!store || store.status !== "active") {
    return { title: "Decor store not found", robots: { index: false, follow: false } };
  }

  const canonical = `/decor/${store.slug}`;
  const categories = store.decorCategories?.length ? ` — ${store.decorCategories.slice(0, 3).join(", ")}` : "";

  const title = `${store.companyName}${store.city ? `, Decor Store in ${store.city}` : ""}`;
  const description =
    store.description?.trim() ||
    `${store.companyName} is a home decor store${
      store.city ? ` in ${store.city}` : ""
    }${categories}${
      store.projectsCompleted ? `, ${store.projectsCompleted}+ projects completed` : ""
    }. View portfolio, categories & get a quote on NxtSft.com.`;

  const image = store.coverImage || store.logo;

  return {
    title,
    description: description.slice(0, 200),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonical,
      type: "website",
      images: image ? [{ url: image, alt: store.companyName }] : undefined,
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

export default async function DecorStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  // Only published (active) stores are public; anything else 404s.
  if (!store || store.status !== "active") notFound();

  const url = `${SITE_URL}/decor/${store.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${url}#business`,
        name: store.companyName,
        url,
        ...(store.description?.trim() ? { description: store.description.trim() } : {}),
        ...(store.logo ? { logo: store.logo } : {}),
        ...(store.coverImage || store.logo
          ? { image: store.coverImage || store.logo }
          : {}),
        ...(store.phone ? { telephone: store.phone } : {}),
        ...(store.website ? { sameAs: [store.website] } : {}),
        ...(store.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: store.city,
                ...(store.state ? { addressRegion: store.state } : {}),
                addressCountry: "IN",
              },
            }
          : {}),
        ...(store.areasServed?.length ? { areaServed: store.areasServed } : {}),
        ...(store.decorCategories?.length ? { knowsAbout: store.decorCategories } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Decors", item: `${SITE_URL}/decor` },
          { "@type": "ListItem", position: 3, name: store.companyName, item: url },
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
      <DecorStoreClient slug={slug} />
    </>
  );
}
