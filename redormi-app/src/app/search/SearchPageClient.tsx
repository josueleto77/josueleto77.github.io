"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/search/SearchBar";
import FilterSidebar from "@/components/search/FilterSidebar";
import MapPanel from "@/components/search/MapPanel";
import ListingCard from "@/components/listing/ListingCard";
import { ListingCardSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { defaultFilters, filterListings } from "@/lib/utils/filters";
import type { PropertyType } from "@/lib/types";

const VALID_PROPERTY_TYPES: PropertyType[] = ["studio", "apartment", "house", "villa", "cabin", "loft"];

export default function SearchPageClient() {
  const params = useSearchParams();
  const mode = (params.get("mode") as "rent" | "switch") ?? "rent";
  const { state } = useAppData();
  const [filters, setFilters] = useState(() => {
    const type = params.get("type");
    const amenity = params.get("amenity");
    return {
      ...defaultFilters(mode),
      where: params.get("where") ?? "",
      propertyTypes:
        type && VALID_PROPERTY_TYPES.includes(type as PropertyType) ? [type as PropertyType] : [],
      amenities: amenity ? [amenity] : [],
    };
  });
  const [showMap, setShowMap] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const results = useMemo(() => filterListings(state.listings, filters), [state.listings, filters]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <SearchBar variant="compact" initial={{ where: filters.where, mode: filters.mode }} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          <button
            onClick={() => setFilters((f) => ({ ...f, mode: "rent", switchOnly: false }))}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              filters.mode === "rent" ? "bg-coral text-white" : "text-navy/60"
            }`}
          >
            Rent
          </button>
          <button
            onClick={() => setFilters((f) => ({ ...f, mode: "switch", switchOnly: true }))}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              filters.mode === "switch" ? "bg-sage text-navy" : "text-navy/60"
            }`}
          >
            Switch
          </button>
        </div>
        <p className="text-sm font-semibold text-navy/70">{results.length} homes found</p>
        <button
          onClick={() => setShowMap((s) => !s)}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-navy/15 px-3.5 py-1.5 text-sm font-semibold text-navy lg:hidden"
        >
          <Icon name={showMap ? "list" : "map-pin"} className="h-4 w-4" />
          {showMap ? "Show list" : "Show map"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_380px]">
        <aside className="hidden lg:block">
          <FilterSidebar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
        </aside>

        <div className={showMap ? "hidden lg:block" : ""}>
          {results.length === 0 ? (
            <EmptyState
              icon="search"
              title="No homes match those filters"
              body="Try widening your price range or clearing a few filters."
            />
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((listing) => (
                <div
                  key={listing.id}
                  onMouseEnter={() => setHoveredId(listing.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <ListingCard listing={listing} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${showMap ? "" : "hidden lg:block"}`}>
          <MapPanel listings={results} activeId={hoveredId} onHover={setHoveredId} />
        </div>
      </div>

      <div className="mt-3 lg:hidden">
        <details className="rounded-2xl border border-navy/10 bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-navy">Filters</summary>
          <div className="mt-4">
            <FilterSidebar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
          </div>
        </details>
      </div>
    </div>
  );
}

export function SearchLoadingSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:grid-cols-2 sm:px-6 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
