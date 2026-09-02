import type { Listing } from "@/lib/types";

export interface Projected {
  listing: Listing;
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
}

export function projectListings(listings: Listing[]): Projected[] {
  if (listings.length === 0) return [];
  const lats = listings.map((l) => l.lat);
  const lngs = listings.map((l) => l.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.4);
  const lngSpan = Math.max(maxLng - minLng, 0.4);
  const pad = 12;

  return listings.map((listing) => {
    const xRaw = ((listing.lng - minLng) / lngSpan) * (100 - pad * 2) + pad;
    const yRaw = (1 - (listing.lat - minLat) / latSpan) * (100 - pad * 2) + pad;
    return { listing, x: xRaw, y: yRaw };
  });
}
