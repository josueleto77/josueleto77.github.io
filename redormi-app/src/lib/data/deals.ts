import type { LastMinuteDeal, SearchHistoryEntry } from "@/lib/types";
import { getListing } from "@/lib/data/listings";
import { DEMO_USER_ID } from "@/lib/data/users";
import { addDays } from "@/lib/utils/format";
import { seedToday as isoToday, seedHoursFromNow, seedHoursAgo } from "@/lib/utils/seedClock";

interface DealSeed {
  listingId: string;
  startOffset: number;
  nights: number;
  discountPercent: number;
  expiresInHours: number;
  matchedArea?: string;
}

const dealSeeds: DealSeed[] = [
  { listingId: "lst_20", startOffset: 4, nights: 4, discountPercent: 22, expiresInHours: 30, matchedArea: "Tulum" },
  { listingId: "lst_10", startOffset: 6, nights: 5, discountPercent: 18, expiresInHours: 44, matchedArea: "Ubud" },
  { listingId: "lst_3", startOffset: 3, nights: 3, discountPercent: 25, expiresInHours: 18, matchedArea: "Ibiza" },
  { listingId: "lst_18", startOffset: 8, nights: 4, discountPercent: 15, expiresInHours: 60 },
  { listingId: "lst_9", startOffset: 2, nights: 6, discountPercent: 20, expiresInHours: 12 },
  { listingId: "lst_14", startOffset: 10, nights: 3, discountPercent: 17, expiresInHours: 50 },
  { listingId: "lst_23", startOffset: 5, nights: 4, discountPercent: 12, expiresInHours: 36 },
  { listingId: "lst_2", startOffset: 3, nights: 3, discountPercent: 20, expiresInHours: 8 },
];

export const lastMinuteDeals: LastMinuteDeal[] = dealSeeds.map((d, i) => ({
  id: `deal_${i + 1}`,
  listingId: d.listingId,
  start: addDays(isoToday(), d.startOffset),
  end: addDays(isoToday(), d.startOffset + d.nights),
  discountPercent: d.discountPercent,
  expiresAt: seedHoursFromNow(d.expiresInHours),
  createdAt: seedHoursAgo(4),
  matchedArea: d.matchedArea,
}));

export function dealForListing(listingId: string): LastMinuteDeal | undefined {
  return lastMinuteDeals.find((d) => d.listingId === listingId);
}

export const searchHistory: SearchHistoryEntry[] = [
  {
    id: "sh_1",
    userId: DEMO_USER_ID,
    area: "Tulum",
    geo: { lat: 20.2114, lng: -87.4654 },
    dateRangeStart: addDays(isoToday(), 4),
    dateRangeEnd: addDays(isoToday(), 8),
    guests: 2,
    timestamp: addDays(isoToday(), -2),
  },
  {
    id: "sh_2",
    userId: DEMO_USER_ID,
    area: "Ubud",
    geo: { lat: -8.5069, lng: 115.2625 },
    dateRangeStart: addDays(isoToday(), 6),
    dateRangeEnd: addDays(isoToday(), 11),
    guests: 2,
    timestamp: addDays(isoToday(), -1),
  },
  {
    id: "sh_3",
    userId: DEMO_USER_ID,
    area: "Ibiza",
    geo: { lat: 38.9067, lng: 1.4206 },
    timestamp: addDays(isoToday(), -5),
  },
];

export function dealListing(deal: LastMinuteDeal) {
  return getListing(deal.listingId);
}
