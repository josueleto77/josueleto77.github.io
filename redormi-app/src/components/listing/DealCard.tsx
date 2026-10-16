"use client";

import Link from "next/link";
import type { LastMinuteDeal, Listing } from "@/lib/types";
import Icon from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import { useAppData } from "@/lib/store/AppDataContext";
import { formatMoney, formatDateShort, nightsBetween } from "@/lib/utils/format";
import { priceBreakdown } from "@/lib/utils/pricing";
import { useCountdownText } from "@/lib/utils/useClientOnly";
import { listingHref } from "@/lib/utils/listingHref";

export default function DealCard({ deal, listing }: { deal: LastMinuteDeal; listing: Listing }) {
  const left = useCountdownText(deal.expiresAt);
  const { isSaved, toggleSaved } = useAppData();
  const saved = isSaved(listing.id);
  const discounted = Math.round(listing.pricing.baseNightly * (1 - deal.discountPercent / 100));
  const nights = nightsBetween(deal.start, deal.end);
  const total = priceBreakdown(listing.pricing, nights, deal.discountPercent).total;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Link href={listingHref(listing.id)} className="block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.photos[0]?.url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="coral">Save {deal.discountPercent}%</Badge>
          {listing.switch.enabled && (
            <Badge tone="sage" icon={<Icon name="sparkles" className="h-3 w-3" />}>
              Switch
            </Badge>
          )}
        </div>
        <button
          onClick={() => toggleSaved(listing.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved homes" : "Save home"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:scale-105"
        >
          <Icon name={saved ? "heart-filled" : "heart"} className={`h-4 w-4 ${saved ? "text-coral" : ""}`} />
        </button>
        {left && left !== "Expired" && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-navy/80 px-2.5 py-1 text-[11px] font-bold text-white">
            <Icon name="clock" className="h-3 w-3" />
            {left}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-bold text-navy">{listing.title}</h3>
          <StarRating rating={listing.ratingAvg} count={listing.ratingCount} />
        </div>
        <p className="text-sm text-ink/60">
          {listing.city}, {listing.country}
        </p>
        <p className="text-xs text-ink/60">
          {formatDateShort(deal.start)} – {formatDateShort(deal.end)} · {nights} night{nights === 1 ? "" : "s"}
        </p>
        {deal.matchedArea && (
          <p className="text-xs italic text-sage-dark">Because you searched {deal.matchedArea}</p>
        )}

        <p className="mt-1 text-sm">
          <span className="mr-1.5 text-ink/40 line-through">{formatMoney(listing.pricing.baseNightly)}</span>
          <span className="font-bold text-coral">{formatMoney(discounted)}</span>
          <span className="text-ink/60"> /night</span>
        </p>
        <p className="text-xs text-ink/60">{formatMoney(total)} total for {nights} night{nights === 1 ? "" : "s"}, incl. fees</p>

        <Button href={listingHref(listing.id)} variant="primary" size="sm" className="mt-2.5 w-full">
          View Deal
        </Button>
      </div>
    </div>
  );
}
