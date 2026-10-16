"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import RangeSlider from "@/components/ui/RangeSlider";
import DealCard from "@/components/listing/DealCard";
import ListingCard from "@/components/listing/ListingCard";
import { useAppData } from "@/lib/store/AppDataContext";
import { haversineKm } from "@/lib/utils/rank";
import { PROPERTY_TYPE_LABEL } from "@/lib/utils/filters";
import type { LastMinuteDeal, PropertyType } from "@/lib/types";

// Fallback origin for "closest" sorting when the browser's real location
// isn't available (denied, unsupported, or not requested yet): Seattle, WA.
const FALLBACK_LOCATION = { lat: 47.6062, lng: -122.3321 };

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[];
const DISCOUNT_MINIMUMS = [10, 20, 30];
const MAX_PRICE = 700;

type Sort = "biggest" | "soonest" | "closest";

export default function SpecialOffersClient() {
  const { state } = useAppData();
  const [sort, setSort] = useState<Sort>("biggest");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const [where, setWhere] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const requestLocation = useCallback(() => {
    if (userLocation || locationDenied || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationDenied(true),
      { timeout: 8000 }
    );
  }, [userLocation, locationDenied]);

  useEffect(() => {
    if (sort === "closest") requestLocation();
  }, [sort, requestLocation]);

  const origin = userLocation ?? FALLBACK_LOCATION;

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

  const dealsWithListing = useMemo(() => {
    return offerDeals
      .map((deal) => ({ deal, listing: state.listings.find((l) => l.id === deal.listingId) }))
      .filter((x): x is { deal: LastMinuteDeal; listing: NonNullable<typeof x.listing> } => !!x.listing);
  }, [offerDeals, state.listings]);

  const filtered = useMemo(() => {
    return dealsWithListing.filter(({ deal, listing }) => {
      if (deal.discountPercent < minDiscount) return false;
      if (propertyType && listing.propertyType !== propertyType) return false;
      if (listing.pricing.baseNightly > maxPrice) return false;
      if (where) {
        const q = where.toLowerCase();
        const haystack = `${listing.city} ${listing.region} ${listing.country}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [dealsWithListing, minDiscount, propertyType, maxPrice, where]);

  const sorted = useMemo(() => {
    switch (sort) {
      case "biggest":
        return [...filtered].sort((a, b) => b.deal.discountPercent - a.deal.discountPercent);
      case "soonest":
        return [...filtered].sort((a, b) => new Date(a.deal.expiresAt).getTime() - new Date(b.deal.expiresAt).getTime());
      case "closest":
        return [...filtered].sort(
          (a, b) =>
            haversineKm(origin, { lat: a.listing.lat, lng: a.listing.lng }) -
            haversineKm(origin, { lat: b.listing.lat, lng: b.listing.lng })
        );
    }
  }, [filtered, sort, origin]);

  const hasAnyDeals = dealsWithListing.length > 0;
  const popularStays = useMemo(
    () => state.listings.filter((l) => l.status === "published" && !l.removedAt).slice(0, 6),
    [state.listings]
  );

  const filterControls = (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="offers-where" className="mb-1.5 block text-sm font-semibold text-navy">
          Destination
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-3.5 py-2.5">
          <Icon name="map-pin" className="h-4 w-4 text-navy/40" />
          <input
            id="offers-where"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Search by city or country"
            className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-navy">Minimum discount</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMinDiscount(0)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              minDiscount === 0 ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
            }`}
          >
            Any
          </button>
          {DISCOUNT_MINIMUMS.map((pct) => (
            <button
              key={pct}
              onClick={() => setMinDiscount(pct)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                minDiscount === pct ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
              }`}
            >
              {pct}%+
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-navy">Property type</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPropertyType(null)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              propertyType === null ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
            }`}
          >
            Any
          </button>
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt}
              onClick={() => setPropertyType(propertyType === pt ? null : pt)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                propertyType === pt ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
              }`}
            >
              {PROPERTY_TYPE_LABEL[pt]}
            </button>
          ))}
        </div>
      </div>

      <RangeSlider
        id="offers-max-price"
        label="Price per night, up to"
        min={0}
        max={MAX_PRICE}
        step={10}
        value={maxPrice}
        onChange={setMaxPrice}
        formatValue={(v) => `$${v}`}
      />
    </div>
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-56 w-full overflow-hidden sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/redormi-special-offers/1800/900"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/50 to-navy/15" />
          <div className="absolute inset-0 flex items-end pb-7 sm:items-center sm:pb-0">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <h1 className="max-w-xl text-3xl font-extrabold text-white sm:text-5xl">
                Extraordinary stays. Exceptional deals.
              </h1>
              <p className="mt-2 max-w-lg text-sm text-white/85 sm:text-base">
                Discover exclusive discounts, last-minute escapes, and special offers on beautiful stays around the
                world.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="#offers" variant="primary">
                  Explore Deals
                </Button>
                <Button href="/search" variant="outline" className="border-white text-white hover:bg-white hover:text-navy">
                  Browse All Stays
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="offers" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
            {sort === "closest" && !userLocation && (
              <span className="text-xs text-ink/40">
                {locationDenied ? "(from Seattle, WA — enable location for accuracy)" : "(getting your location…)"}
              </span>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-bold text-navy lg:hidden"
          >
            <Icon name="filter" className="h-4 w-4" />
            Filters
          </button>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-navy/10 bg-white p-5">
              <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-navy/60">Filters</h2>
              {filterControls}
            </div>
          </aside>

          <div>
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-navy/10 bg-white px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand/60 text-coral">
                  <Icon name="flame" className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-navy sm:text-2xl">Great escapes are worth discovering.</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
                    {hasAnyDeals
                      ? "No offers match your filters right now. Try widening your search."
                      : "There are no active deals at the moment, but your next favorite stay could already be waiting."}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button href="/search" variant="primary">
                    Explore All Stays
                  </Button>
                  <Button href="/switch" variant="outline">
                    Discover Redormi Switch
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map(({ deal, listing }) => (
                  <DealCard key={deal.id} deal={deal} listing={listing} />
                ))}
              </div>
            )}

            {sorted.length === 0 && popularStays.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-extrabold text-navy">Popular stays</h2>
                <p className="mt-1 text-sm text-ink/60">Browse homes available right now.</p>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {popularStays.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Redormi Switch promo */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-navy p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Your home is your passport.</h2>
            <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">
              Discover a different way to travel. Exchange homes, explore new destinations, and unlock more travel
              possibilities with Redormi Switch.
            </p>
          </div>
          <Button href="/switch" variant="switch" className="shrink-0">
            Explore Redormi Switch
          </Button>
        </div>
      </section>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" size="md">
        {filterControls}
        <Button variant="primary" fullWidth className="mt-6" onClick={() => setFiltersOpen(false)}>
          Show {sorted.length} offer{sorted.length === 1 ? "" : "s"}
        </Button>
      </Modal>
    </div>
  );
}
