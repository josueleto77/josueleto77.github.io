"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import ListingCard from "@/components/listing/ListingCard";
import EmptyState from "@/components/ui/EmptyState";
import { useAppData } from "@/lib/store/AppDataContext";
import { hotScore } from "@/lib/utils/rank";
import { PROPERTY_TYPE_LABEL } from "@/lib/utils/filters";
import type { PropertyType } from "@/lib/types";

export default function HotPlacesClient() {
  const { state } = useAppData();
  const [region, setRegion] = useState("all");
  const [propertyType, setPropertyType] = useState<PropertyType | "all">("all");

  const ranked = useMemo(() => {
    return state.listings
      .filter((l) => l.status === "published")
      .map((l) => ({ listing: l, score: hotScore(l, state.users.find((u) => u.id === l.hostId)) }))
      .sort((a, b) => b.score - a.score);
  }, [state.listings, state.users]);

  const regions = Array.from(new Set(state.listings.map((l) => l.country))).sort();

  const filtered = ranked.filter(
    ({ listing }) =>
      (region === "all" || listing.country === region) && (propertyType === "all" || listing.propertyType === propertyType)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold text-navy">
          <Icon name="flame" className="h-7 w-7 text-coral" />
          Hot Places
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink/60">
          Ranked by a blend of average rating, review volume, recent booking velocity, host response rate, and
          repeat-guest rate.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-xl border border-navy/15 px-3.5 py-2 text-sm">
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value as PropertyType | "all")}
          className="rounded-xl border border-navy/15 px-3.5 py-2 text-sm"
        >
          <option value="all">All property types</option>
          {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((pt) => (
            <option key={pt} value={pt}>
              {PROPERTY_TYPE_LABEL[pt]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="flame" title="No homes match those filters" />
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map(({ listing, score }, i) => (
            <div key={listing.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Badge tone="navy">#{i + 1}</Badge>
                <span className="text-xs font-semibold text-ink/50">Hot score {score}/100</span>
              </div>
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
