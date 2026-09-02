import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listings, getListing } from "@/lib/data/listings";
import ListingDetailClient from "./ListingDetailClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return listings.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) return {};
  return {
    title: listing.title,
    description: listing.description.slice(0, 155),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 155),
      images: listing.photos[0] ? [listing.photos[0].url] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: listing.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      addressRegion: listing.region,
      addressCountry: listing.country,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: listing.ratingAvg,
      reviewCount: listing.ratingCount,
    },
    priceRange: `$${listing.pricing.baseNightly}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListingDetailClient listingId={id} />
    </>
  );
}
