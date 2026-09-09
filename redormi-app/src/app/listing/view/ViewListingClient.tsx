"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/store/AppDataContext";
import { fetchListingById } from "@/lib/supabase/listings";
import EmptyState from "@/components/ui/EmptyState";
import { ListingCardSkeleton } from "@/components/ui/Skeleton";
import ListingDetailClient from "@/app/listing/[id]/ListingDetailClient";

/**
 * Renders a listing looked up by ?id= at runtime, entirely client-side.
 * This exists because the site is a static export with no server: the
 * pretty /listing/[id]/ pages only cover the fixed set of IDs known at
 * build time (the seed/demo listings). A real, host-created listing has
 * no build-time page, so its links point here instead — the id is read
 * from the query string and the listing is fetched live from Supabase.
 */
export default function ViewListingClient() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { state, createListing } = useAppData();
  const cached = state.listings.find((l) => l.id === id);
  // "Not found" (no id) and "already have it" (cached) are pure derivations
  // from props/state — only the actual fetch needs an effect, and its
  // result only ever arrives asynchronously in the .then() callback below.
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || cached) return;
    let cancelled = false;
    fetchListingById(id).then((listing) => {
      if (cancelled) return;
      if (listing) {
        createListing(listing);
      } else {
        setNotFound(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!cached]);

  if (!id || notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon="search" title="Listing not found" body="This listing may have been removed or the link is incorrect." />
      </div>
    );
  }

  if (!cached) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ListingCardSkeleton />
      </div>
    );
  }

  return <ListingDetailClient listingId={id} />;
}
