"use client";

import { useState } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import Icon from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import { useAppData } from "@/lib/store/AppDataContext";
import { formatMoney } from "@/lib/utils/format";
import { dealForListing } from "@/lib/data/deals";

export default function ListingCard({ listing, showOffers = true }: { listing: Listing; showOffers?: boolean }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const { isSaved, toggleSaved } = useAppData();
  const saved = isSaved(listing.id);
  const deal = dealForListing(listing.id);
  const discounted = deal ? Math.round(listing.pricing.baseNightly * (1 - deal.discountPercent / 100)) : null;

  return (
    <div className="group flex flex-col gap-2.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy/5">
        <Link href={`/listing/${listing.id}`} className="block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.photos[photoIdx]?.url}
            alt={listing.photos[photoIdx]?.alt ?? listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {listing.isHot && (
            <Badge tone="coral" icon={<Icon name="flame" className="h-3 w-3" />}>
              Hot
            </Badge>
          )}
          {deal && <Badge tone="coral">{deal.discountPercent}% off</Badge>}
          {listing.switch.enabled && (
            <Badge tone="sage" icon={<Icon name="sparkles" className="h-3 w-3" />}>
              Switch
            </Badge>
          )}
          {showOffers && listing.acceptsOffers && !deal && <Badge tone="cream">Accepts offers</Badge>}
        </div>

        <button
          onClick={() => toggleSaved(listing.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved homes" : "Save home"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:scale-105"
        >
          <Icon name={saved ? "heart-filled" : "heart"} className={`h-4 w-4 ${saved ? "text-coral" : ""}`} />
        </button>

        {listing.photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1">
            {listing.photos.slice(0, 6).map((p, i) => (
              <button
                key={p.id}
                onClick={(e) => {
                  e.preventDefault();
                  setPhotoIdx(i);
                }}
                aria-label={`Show photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === photoIdx ? "w-3.5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <Link href={`/listing/${listing.id}`} className="flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-bold text-navy">{listing.title}</h3>
          <StarRating rating={listing.ratingAvg} showValue />
        </div>
        <p className="text-sm text-ink/60">
          {listing.city}, {listing.country}
        </p>
        <p className="mt-1 text-sm">
          {discounted ? (
            <>
              <span className="mr-1.5 text-ink/40 line-through">{formatMoney(listing.pricing.baseNightly)}</span>
              <span className="font-bold text-coral">{formatMoney(discounted)}</span>
            </>
          ) : (
            <span className="font-bold text-navy">{formatMoney(listing.pricing.baseNightly)}</span>
          )}{" "}
          <span className="text-ink/60">night</span>
        </p>
      </Link>
    </div>
  );
}
