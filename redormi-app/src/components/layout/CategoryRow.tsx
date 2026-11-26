"use client";

import { useMemo } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import type { PropertyType } from "@/lib/types";

type Category = { label: string; icon: IconName; href: string } & (
  | { kind: "type"; propertyType: PropertyType }
  | { kind: "amenity"; amenity: string }
  | { kind: "switch" }
);

const CATEGORIES: Category[] = [
  { label: "Houses", icon: "home", href: "/search?type=house", kind: "type", propertyType: "house" },
  { label: "Apartments", icon: "elevator", href: "/search?type=apartment", kind: "type", propertyType: "apartment" },
  { label: "Villas", icon: "garden", href: "/search?type=villa", kind: "type", propertyType: "villa" },
  { label: "Cabins", icon: "fireplace", href: "/search?type=cabin", kind: "type", propertyType: "cabin" },
  { label: "Studios", icon: "bed", href: "/search?type=studio", kind: "type", propertyType: "studio" },
  { label: "Lofts", icon: "layers", href: "/search?type=loft", kind: "type", propertyType: "loft" },
  { label: "Pools", icon: "pool", href: "/search?amenity=pool", kind: "amenity", amenity: "pool" },
  { label: "Pet friendly", icon: "pet", href: "/search?amenity=pet_friendly", kind: "amenity", amenity: "pet_friendly" },
  { label: "Switch homes", icon: "sparkles", href: "/switch", kind: "switch" },
];

export default function CategoryRow() {
  const { state } = useAppData();

  const published = useMemo(
    () => state.listings.filter((l) => l.status === "published" && !l.removedAt),
    [state.listings]
  );
  const hasResults = (c: Category) => {
    if (c.kind === "switch") return true;
    if (c.kind === "type") return published.some((l) => l.propertyType === c.propertyType);
    return published.some((l) => l.amenities.includes(c.amenity));
  };
  const ordered = useMemo(
    () => [...CATEGORIES].sort((a, b) => Number(hasResults(b)) - Number(hasResults(a))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasResults is derived from `published`, already a dep
    [published]
  );

  return (
    <nav aria-label="Browse by category" className="border-b border-navy/10 bg-white">
      <div className="scrollbar-thin mx-auto flex max-w-7xl gap-7 overflow-x-auto px-4 py-4 sm:px-6">
        {ordered.map((c) => {
          const active = hasResults(c);
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`group flex shrink-0 flex-col items-center gap-2 transition-colors ${
                active ? "text-navy/60 hover:text-navy" : "text-navy/30 hover:text-navy/60"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors group-hover:bg-coral/10 group-hover:text-coral ${
                  active ? "bg-sand/70 text-navy/70" : "bg-sand/30 text-navy/30"
                }`}
              >
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <span className="whitespace-nowrap text-xs font-semibold">{c.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
