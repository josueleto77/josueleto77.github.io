import type { Listing, SwitchTierLabel, SwitchTierScore, User } from "@/lib/types";
import { clamp } from "@/lib/utils/format";

const AMENITY_WEIGHT: Record<string, number> = {
  pool: 0.35,
  hot_tub: 0.25,
  parking: 0.1,
  workspace: 0.1,
  ac: 0.15,
  laundry: 0.15,
  gym: 0.1,
  waterfront: 0.3,
  fireplace: 0.1,
};

export function tierLabel(composite: number): SwitchTierLabel {
  if (composite >= 4.5) return "Diamond";
  if (composite >= 3.75) return "Platinum";
  if (composite >= 3) return "Gold";
  if (composite >= 2.25) return "Silver";
  return "Bronze";
}

/** Property type & quality sub-score (0-5). */
export function propertyScore(listing: Listing): number {
  const typeWeight: Record<string, number> = {
    studio: 2.4,
    apartment: 3,
    house: 3.6,
    cabin: 3.4,
    loft: 3.2,
    villa: 4.4,
  };
  let score = typeWeight[listing.propertyType] ?? 3;
  score += clamp((listing.bedrooms - 1) * 0.15, 0, 0.6);
  score += clamp((listing.baths - 1) * 0.1, 0, 0.4);
  score += clamp((listing.guests - 2) * 0.05, 0, 0.3);
  const amenityBonus = listing.amenities.reduce(
    (sum, a) => sum + (AMENITY_WEIGHT[a] ?? 0.02),
    0
  );
  score += clamp(amenityBonus, 0, 0.9);
  score += clamp((listing.photos.length - 5) * 0.04, 0, 0.3);
  score += listing.yearRenovated >= 2020 ? 0.3 : listing.yearRenovated >= 2015 ? 0.15 : 0;
  score += clamp((listing.sqft - 700) / 4000, 0, 0.4);
  return clamp(Math.round(score * 100) / 100, 0.5, 5);
}

/** Location sub-score (0-5). Deterministic pseudo-desirability from geo + destination "prestige" list. */
const DESIRABLE_CITIES: Record<string, number> = {
  "Tulum": 4.6,
  "Barcelona": 4.7,
  "Lisbon": 4.5,
  "Paris": 4.8,
  "Kyoto": 4.6,
  "Cape Town": 4.3,
  "Bali": 4.5,
  "Queenstown": 4.4,
  "Reykjavik": 4.2,
  "Santorini": 4.7,
};

export function locationScore(listing: Listing): number {
  const base = DESIRABLE_CITIES[listing.city] ?? 3.4;
  const seasonalityBoost = listing.bookingVelocity > 6 ? 0.2 : 0;
  return clamp(Math.round((base + seasonalityBoost) * 100) / 100, 0.5, 5);
}

/** Owner standing sub-score (0-5). */
export function ownerScore(host: User | undefined): number {
  if (!host) return 2.5;
  let score = 2.5;
  if (host.verification.identity === "verified") score += 0.8;
  else if (host.verification.identity === "pending") score += 0.3;
  score += clamp(((host.ratingAvg ?? 4) - 4) * 2, -0.5, 1);
  score += clamp(((host.responseRate ?? 80) - 80) / 40, -0.3, 0.5);
  const yearsOnPlatform =
    (Date.now() - new Date(host.memberSince).getTime()) / (365 * 24 * 3600 * 1000);
  score += clamp(yearsOnPlatform * 0.1, 0, 0.5);
  return clamp(Math.round(score * 100) / 100, 0.5, 5);
}

export function computeSwitchTier(listing: Listing, host: User | undefined): SwitchTierScore {
  const p = propertyScore(listing);
  const l = locationScore(listing);
  const o = ownerScore(host);
  const composite = clamp(Math.round(((p + l + o) / 3) * 100) / 100, 0.5, 5);

  const tips: { text: string; delta: number }[] = [];
  if (listing.photos.length < 10) {
    tips.push({ text: `Add ${10 - listing.photos.length} more photos`, delta: 0.2 });
  }
  if (!listing.amenities.includes("pool") && !listing.amenities.includes("hot_tub")) {
    tips.push({ text: "Add a pool or hot tub amenity", delta: 0.3 });
  }
  if (host && host.verification.identity !== "verified") {
    tips.push({ text: "Complete identity verification", delta: 0.6 });
  }
  if (host && (host.responseRate ?? 0) < 90) {
    tips.push({ text: "Improve response rate to 90%+", delta: 0.15 });
  }
  if (listing.yearRenovated < 2018) {
    tips.push({ text: "Note recent renovations in your listing", delta: 0.15 });
  }

  return {
    propertyScore: p,
    locationScore: l,
    ownerScore: o,
    composite,
    label: tierLabel(composite),
    tips: tips.slice(0, 4),
  };
}

export function tierGap(a: SwitchTierScore | undefined, b: SwitchTierScore | undefined): number {
  if (!a || !b) return 0;
  return Math.round(Math.abs(a.composite - b.composite) * 10) / 10;
}

export const TIER_ORDER: SwitchTierLabel[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
