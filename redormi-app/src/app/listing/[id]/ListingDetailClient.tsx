"use client";

import { notFound } from "next/navigation";
import { useAppData } from "@/lib/store/AppDataContext";
import PhotoGallery from "@/components/listing/PhotoGallery";
import HostCard from "@/components/listing/HostCard";
import AmenityList from "@/components/listing/AmenityList";
import ReviewCard from "@/components/listing/ReviewCard";
import SimilarHomes from "@/components/listing/SimilarHomes";
import BookingBox from "@/components/listing/BookingBox";
import ExtraServiceCard from "@/components/services/ExtraServiceCard";
import TierBreakdownCard from "@/components/switch/TierBreakdownCard";
import StarRating from "@/components/ui/StarRating";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import { reviewsForListing } from "@/lib/data/reviews";
import { CANCELLATION_POLICY_TEXT } from "@/lib/utils/policy";
import { computeSwitchTier } from "@/lib/utils/tier";
import { formatDateShort } from "@/lib/utils/format";
import { PROPERTY_TYPE_LABEL } from "@/lib/utils/filters";

export default function ListingDetailClient({ listingId }: { listingId: string }) {
  const { state } = useAppData();
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return notFound();

  const host = state.users.find((u) => u.id === listing.hostId);
  const reviews = reviewsForListing(listing.id);
  const services = state.extraServices.filter((s) => s.listingId === listing.id);
  const similar = state.listings.filter(
    (l) => l.id !== listing.id && (l.city === listing.city || l.propertyType === listing.propertyType)
  );
  const tierScore = listing.switch.enabled ? computeSwitchTier(listing, host) : null;
  const blockedWindows = listing.availability.filter((w) => w.blocked);

  const avgSub = reviews.length
    ? {
        cleanliness: avg(reviews.map((r) => r.subscores.cleanliness)),
        accuracy: avg(reviews.map((r) => r.subscores.accuracy)),
        communication: avg(reviews.map((r) => r.subscores.communication)),
        location: avg(reviews.map((r) => r.subscores.location)),
        checkIn: avg(reviews.map((r) => r.subscores.checkIn)),
        value: avg(reviews.map((r) => r.subscores.value)),
      }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{listing.title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/70">
          <StarRating rating={listing.ratingAvg} count={listing.ratingCount} />
          <span className="flex items-center gap-1">
            <Icon name="map-pin" className="h-3.5 w-3.5" />
            {listing.city}, {listing.region}, {listing.country}
          </span>
          {listing.isHot && (
            <Badge tone="coral" icon={<Icon name="flame" className="h-3 w-3" />}>
              Hot
            </Badge>
          )}
          {listing.switch.enabled && (
            <Badge tone="sage" icon={<Icon name="sparkles" className="h-3 w-3" />}>
              Switch enabled
            </Badge>
          )}
        </div>
      </div>

      <PhotoGallery photos={listing.photos} title={listing.title} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 pb-6">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy">
              <span>{PROPERTY_TYPE_LABEL[listing.propertyType]}</span>
              <span className="flex items-center gap-1"><Icon name="users" className="h-4 w-4" />{listing.guests} guests</span>
              <span className="flex items-center gap-1"><Icon name="bed" className="h-4 w-4" />{listing.bedrooms} bedrooms · {listing.beds} beds</span>
              <span className="flex items-center gap-1"><Icon name="bath" className="h-4 w-4" />{listing.baths} baths</span>
            </div>
          </div>

          {host && <HostCard host={host} listingId={listing.id} />}

          <p className="text-sm leading-relaxed text-ink/80">{listing.description}</p>

          <div>
            <h2 className="mb-4 text-xl font-extrabold text-navy">What this place offers</h2>
            <AmenityList amenityIds={listing.amenities} />
          </div>

          {tierScore && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-navy">
                <Icon name="sparkles" className="h-5 w-5 text-sage-dark" />
                Redormi Switch Tier
              </h2>
              <TierBreakdownCard score={tierScore} compact />
              <p className="mt-3 text-sm text-ink/60">
                This home is open to swaps
                {listing.switch.travelDatesStart && listing.switch.travelDatesEnd
                  ? ` from ${formatDateShort(listing.switch.travelDatesStart)} to ${formatDateShort(listing.switch.travelDatesEnd)}`
                  : ""}
                {listing.switch.destinationWishlist?.length
                  ? `, looking for a swap in ${listing.switch.destinationWishlist.join(", ")}.`
                  : "."}
              </p>
              <Button href="/switch" variant="switch" size="sm" className="mt-3">
                Propose a swap
              </Button>
            </div>
          )}

          {services.length > 0 && (
            <div>
              <h2 className="mb-1 text-xl font-extrabold text-navy">Extra services</h2>
              <p className="mb-4 text-sm text-ink/60">Add these during checkout, or later from your trip page.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <ExtraServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-xl font-extrabold text-navy">House rules</h2>
            <ul className="grid grid-cols-1 gap-2 text-sm text-ink/70 sm:grid-cols-2">
              {listing.houseRules.map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-sage-dark" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-extrabold text-navy">Cancellation policy</h2>
            <div className="rounded-2xl border border-navy/10 bg-white p-4">
              <p className="text-sm font-bold text-navy">{CANCELLATION_POLICY_TEXT[listing.cancellationPolicy].title}</p>
              <p className="mt-1 text-sm text-ink/70">{CANCELLATION_POLICY_TEXT[listing.cancellationPolicy].body}</p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-extrabold text-navy">Availability</h2>
            <div className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-ink/70">
              <p>
                Stays of {listing.minNights}–{listing.maxNights} nights.
              </p>
              {blockedWindows.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {blockedWindows.map((w) => (
                    <li key={w.start} className="flex items-center gap-2">
                      <Icon name="x" className="h-3.5 w-3.5 text-coral" />
                      Unavailable {formatDateShort(w.start)} – {formatDateShort(w.end)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-sage-dark">
                  <Icon name="check-circle" className="h-4 w-4" /> Fully open — no blocked dates right now.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-navy">
                <StarRating rating={listing.ratingAvg} /> · {listing.ratingCount} reviews
              </h2>
            </div>
            {avgSub && (
              <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                {Object.entries(avgSub).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-xs font-semibold capitalize text-navy/70">
                      <span>{key === "checkIn" ? "Check-in" : key}</span>
                      <span>{value.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy/8">
                      <div className="h-full rounded-full bg-navy" style={{ width: `${(value / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          </div>

          <SimilarHomes listings={similar} currentId={listing.id} />
        </div>

        <div>
          <BookingBox listing={listing} />
        </div>
      </div>
    </div>
  );
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
