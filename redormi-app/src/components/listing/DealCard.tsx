"use client";

import Link from "next/link";
import type { LastMinuteDeal, Listing } from "@/lib/types";
import Icon from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import { formatMoney, formatDateShort } from "@/lib/utils/format";
import { useCountdownText } from "@/lib/utils/useClientOnly";

export default function DealCard({ deal, listing }: { deal: LastMinuteDeal; listing: Listing }) {
  const left = useCountdownText(deal.expiresAt);
  const discounted = Math.round(listing.pricing.baseNightly * (1 - deal.discountPercent / 100));

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="flex gap-3 rounded-2xl border border-navy/10 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={listing.photos[0]?.url}
        alt={listing.title}
        className="h-24 w-28 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Badge tone="coral">{deal.discountPercent}% off</Badge>
          <span className="flex items-center gap-1 text-xs font-semibold text-coral-dark">
            <Icon name="clock" className="h-3 w-3" />
            {left ?? "…"}
          </span>
        </div>
        <h3 className="line-clamp-1 text-sm font-bold text-navy">{listing.title}</h3>
        <p className="text-xs text-ink/60">
          {formatDateShort(deal.start)} – {formatDateShort(deal.end)}
        </p>
        {deal.matchedArea && (
          <p className="text-xs italic text-sage-dark">Because you searched {deal.matchedArea}</p>
        )}
        <p className="mt-auto text-sm">
          <span className="mr-1.5 text-ink/40 line-through">{formatMoney(listing.pricing.baseNightly)}</span>
          <span className="font-bold text-coral">{formatMoney(discounted)}</span>
          <span className="text-ink/60"> /night</span>
        </p>
      </div>
    </Link>
  );
}
