"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/icons";
import EmptyState from "@/components/ui/EmptyState";
import DealCard from "@/components/listing/DealCard";
import { useAppData } from "@/lib/store/AppDataContext";
import { haversineKm } from "@/lib/utils/rank";
import type { LastMinuteDeal } from "@/lib/types";

const YOU = { lat: 47.6062, lng: -122.3321 }; // simulated "your location": Seattle, WA

type Sort = "biggest" | "soonest" | "closest";

export default function SpecialOffersClient() {
  const { state } = useAppData();
  const [sort, setSort] = useState<Sort>("biggest");

  const offerDeals: LastMinuteDeal[] = useMemo(() => {
    const covered = new Set(state.deals.map((d) => d.listingId));
    const fromAccepted = state.offers
      .filter((o) => o.status === "accepted" && !covered.has(o.listingId))
      .map((o) => ({
        id: `synthetic-${o.id}`,
        listingId: o.listingId,
        start: o.checkIn,
        end: o.checkOut,
        discountPercent: o.discountPercent,
        expiresAt: new Date(o.checkIn).toISOString(),
        createdAt: o.createdAt,
      }));
    return [...state.deals, ...fromAccepted];
  }, [state.deals, state.offers]);

  const sorted = useMemo(() => {
    const withListing = offerDeals
      .map((deal) => ({ deal, listing: state.listings.find((l) => l.id === deal.listingId) }))
      .filter((x): x is { deal: LastMinuteDeal; listing: NonNullable<typeof x.listing> } => !!x.listing);

    switch (sort) {
      case "biggest":
        return [...withListing].sort((a, b) => b.deal.discountPercent - a.deal.discountPercent);
      case "soonest":
        return [...withListing].sort((a, b) => new Date(a.deal.expiresAt).getTime() - new Date(b.deal.expiresAt).getTime());
      case "closest":
        return [...withListing].sort(
          (a, b) => haversineKm(YOU, { lat: a.listing.lat, lng: a.listing.lng }) - haversineKm(YOU, { lat: b.listing.lat, lng: b.listing.lng })
        );
    }
  }, [offerDeals, state.listings, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold text-navy">Special Offers</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/60">
        Every home with an active discount — host-set promotions, last-minute deals, and accepted-offer pricing.
      </p>

      <div className="my-6 flex items-center gap-2">
        <Icon name="filter" className="h-4 w-4 text-navy/50" />
        {(
          [
            { key: "biggest", label: "Biggest % off" },
            { key: "soonest", label: "Soonest expiring" },
            { key: "closest", label: "Closest to me" },
          ] as { key: Sort; label: string }[]
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              sort === opt.key ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {sort === "closest" && <span className="text-xs text-ink/40">(simulated from Seattle, WA)</span>}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="flame" title="No active offers right now" body="Check back soon — hosts publish new deals regularly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(({ deal, listing }) => (
            <DealCard key={deal.id} deal={deal} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
