"use client";

import type { FilterState } from "@/lib/utils/filters";
import { PROPERTY_TYPE_LABEL } from "@/lib/utils/filters";
import type { PropertyType } from "@/lib/types";
import Toggle from "@/components/ui/Toggle";
import RangeSlider from "@/components/ui/RangeSlider";
import { amenities } from "@/lib/data/amenities";
import Icon from "@/components/ui/icons";
import { formatMoney } from "@/lib/utils/format";

const PROPERTY_TYPES: PropertyType[] = ["studio", "apartment", "house", "villa", "cabin", "loft"];

export default function FilterSidebar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  function toggleArrayValue<K extends "propertyTypes" | "amenities">(key: K, value: string) {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ [key]: next } as Partial<FilterState>);
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-navy/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
          <Icon name="filter" className="h-4 w-4" />
          Filters
        </h2>
        <button
          onClick={() =>
            onChange({
              minPrice: 0,
              maxPrice: 700,
              propertyTypes: [],
              bedrooms: 0,
              beds: 0,
              baths: 0,
              amenities: [],
              instantBookOnly: false,
              minRating: 0,
              acceptsOffersOnly: false,
              switchOnly: false,
              extraServicesOnly: false,
            })
          }
          className="text-xs font-bold text-coral hover:underline"
        >
          Clear all
        </button>
      </div>

      <div>
        <RangeSlider
          min={0}
          max={700}
          step={10}
          value={filters.maxPrice}
          onChange={(v) => onChange({ maxPrice: v })}
          label="Price range / night"
          formatValue={(v) => `Up to ${formatMoney(v)}`}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">Property type</legend>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => toggleArrayValue("propertyTypes", pt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filters.propertyTypes.includes(pt)
                  ? "border-coral bg-coral text-white"
                  : "border-navy/15 text-navy hover:bg-navy/5"
              }`}
            >
              {PROPERTY_TYPE_LABEL[pt]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-3 gap-2">
        {(["bedrooms", "beds", "baths"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold capitalize text-navy">{key}</span>
            <select
              value={filters[key]}
              onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<FilterState>)}
              className="rounded-lg border border-navy/15 px-2 py-1.5 text-sm"
            >
              <option value={0}>Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">Amenities</legend>
        <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {amenities.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={filters.amenities.includes(a.id)}
                onChange={() => toggleArrayValue("amenities", a.id)}
                className="h-4 w-4 accent-coral"
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <Toggle
          label="Instant Book"
          checked={filters.instantBookOnly}
          onChange={(v) => onChange({ instantBookOnly: v })}
        />
        <Toggle
          label="Accepts offers"
          checked={filters.acceptsOffersOnly}
          onChange={(v) => onChange({ acceptsOffersOnly: v })}
        />
        <Toggle
          label="Available for Switch"
          tone="sage"
          checked={filters.switchOnly}
          onChange={(v) => onChange({ switchOnly: v })}
        />
        <Toggle
          label="Extra services available"
          checked={filters.extraServicesOnly}
          onChange={(v) => onChange({ extraServicesOnly: v })}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-navy">Minimum rating</p>
        <div className="flex gap-1.5">
          {[0, 3.5, 4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              onClick={() => onChange({ minRating: r })}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                filters.minRating === r ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
              }`}
            >
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
