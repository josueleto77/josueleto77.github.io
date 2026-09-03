import type { Listing, PropertyType } from "@/lib/types";
import { servicesForListing } from "@/lib/data/services";

export interface FilterState {
  where: string;
  mode: "rent" | "switch";
  minPrice: number;
  maxPrice: number;
  propertyTypes: PropertyType[];
  bedrooms: number; // minimum, 0 = any
  beds: number;
  baths: number;
  amenities: string[];
  instantBookOnly: boolean;
  minRating: number;
  acceptsOffersOnly: boolean;
  switchOnly: boolean;
  extraServicesOnly: boolean;
}

export function defaultFilters(mode: "rent" | "switch" = "rent"): FilterState {
  return {
    where: "",
    mode,
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
    switchOnly: mode === "switch",
    extraServicesOnly: false,
  };
}

export function filterListings(listings: Listing[], f: FilterState): Listing[] {
  return listings.filter((l) => {
    if (l.status !== "published") return false;
    if (f.where) {
      const q = f.where.toLowerCase();
      const haystack = `${l.city} ${l.region} ${l.country} ${l.title}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (l.pricing.baseNightly < f.minPrice || l.pricing.baseNightly > f.maxPrice) return false;
    if (f.propertyTypes.length && !f.propertyTypes.includes(l.propertyType)) return false;
    if (f.bedrooms && l.bedrooms < f.bedrooms) return false;
    if (f.beds && l.beds < f.beds) return false;
    if (f.baths && l.baths < f.baths) return false;
    if (f.amenities.length && !f.amenities.every((a) => l.amenities.includes(a))) return false;
    if (f.instantBookOnly && !l.instantBook) return false;
    if (f.minRating && l.ratingAvg < f.minRating) return false;
    if (f.acceptsOffersOnly && !l.acceptsOffers) return false;
    if (f.switchOnly && !l.switch.enabled) return false;
    if (f.extraServicesOnly && servicesForListing(l.id).length === 0) return false;
    return true;
  });
}

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
  villa: "Villa",
  cabin: "Cabin",
  loft: "Loft",
};
