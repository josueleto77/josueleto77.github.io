"use client";

import type { Listing } from "@/lib/types";
import Link from "next/link";
import { projectListings } from "@/lib/utils/mapProjection";
import { formatMoney } from "@/lib/utils/format";
import { listingHref } from "@/lib/utils/listingHref";

export default function MapPanel({
  listings,
  activeId,
  onHover,
}: {
  listings: Listing[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const points = projectListings(listings);

  return (
    <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-navy/10 bg-sage/15">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(168,181,162,0.5), transparent 45%), radial-gradient(circle at 75% 65%, rgba(233,120,88,0.15), transparent 40%), linear-gradient(135deg, #eef1e9 0%, #e4e9df 45%, #dfe6dc 100%)",
        }}
        aria-hidden="true"
      />
      <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#172A3A" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <p className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-navy/60">
        Stylized map — approximate relative positions
      </p>

      <div className="relative h-full w-full">
        {points.map(({ listing, x, y }) => {
          const active = activeId === listing.id;
          return (
            <Link
              key={listing.id}
              href={listingHref(listing.id)}
              onMouseEnter={() => onHover?.(listing.id)}
              onMouseLeave={() => onHover?.(null)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-xs font-bold shadow-md transition-all ${
                active
                  ? "z-20 scale-110 border-navy bg-navy text-cream"
                  : listing.switch.enabled
                    ? "border-sage-dark bg-sage text-navy hover:scale-105"
                    : "border-coral-dark bg-coral text-white hover:scale-105"
              }`}
            >
              {listing.switch.enabled ? "Switch" : formatMoney(listing.pricing.baseNightly)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
