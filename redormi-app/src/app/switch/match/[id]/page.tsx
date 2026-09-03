import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listings, getListing } from "@/lib/data/listings";
import SwapMatchClient from "./SwapMatchClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return listings.filter((l) => l.switch.enabled).map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = getListing(id);
  return { title: listing ? `Swap for ${listing.title}` : "Swap proposal" };
}

export default async function SwapMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing || !listing.switch.enabled) notFound();
  return <SwapMatchClient targetListingId={id} />;
}
