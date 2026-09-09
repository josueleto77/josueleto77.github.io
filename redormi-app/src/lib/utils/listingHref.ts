import { listings as seedListings } from "@/lib/data/listings";

const SEED_LISTING_IDS = new Set(seedListings.map((l) => l.id));

/**
 * The site is a static export: /listing/[id]/ only has real pages for the
 * fixed set of seed/demo listings baked in at build time. Any other
 * listing (a real, host-created one, or the local-only demo-mode
 * fallback) has no such page, so it links to /listing/view/?id= instead,
 * which resolves the id client-side at runtime.
 */
export function listingHref(listingId: string): string {
  return SEED_LISTING_IDS.has(listingId) ? `/listing/${listingId}` : `/listing/view/?id=${listingId}`;
}
