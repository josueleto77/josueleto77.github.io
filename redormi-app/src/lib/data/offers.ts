import type { Offer } from "@/lib/types";
import { getListing } from "@/lib/data/listings";
import { DEMO_USER_ID } from "@/lib/data/users";
import { priceBreakdown } from "@/lib/utils/pricing";
import { addDays } from "@/lib/utils/format";
import { seedToday as isoToday, seedHoursAgo } from "@/lib/utils/seedClock";

function offerFrom(
  id: string,
  listingId: string,
  guestId: string,
  checkInOffset: number,
  nights: number,
  discountPercent: number,
  status: Offer["status"],
  lastActor: Offer["lastActor"],
  message?: string,
  history: Offer["history"] = [],
  createdOffsetHours = 6
): Offer {
  const listing = getListing(listingId)!;
  const checkIn = addDays(isoToday(), checkInOffset);
  const checkOut = addDays(isoToday(), checkInOffset + nights);
  const breakdown = priceBreakdown(listing.pricing, nights, discountPercent);
  const createdAt = seedHoursAgo(createdOffsetHours);
  return {
    id,
    listingId,
    guestId,
    checkIn,
    checkOut,
    discountPercent,
    resultingNightly: breakdown.nightlyRate,
    resultingTotal: breakdown.total,
    message,
    status,
    expiresAt: addDays(new Date(createdAt).toISOString().slice(0, 10), 2),
    createdAt,
    history,
    lastActor,
  };
}

export const offers: Offer[] = [
  offerFrom(
    "off_1",
    "lst_5",
    "usr_11",
    18,
    5,
    15,
    "pending",
    "guest",
    "Traveling with my partner for our anniversary — would love to make this work!",
    [],
    5
  ),
  offerFrom(
    "off_2",
    "lst_14",
    DEMO_USER_ID,
    30,
    4,
    10,
    "pending",
    "guest",
    "Big fan of your place, hoping for a small discount on a shoulder-season week.",
    [],
    20
  ),
  offerFrom(
    "off_3",
    "lst_23",
    "usr_12",
    22,
    6,
    8,
    "countered",
    "host",
    "Would 15% work? We're flexible on dates too.",
    [
      {
        id: "co_1",
        offerId: "off_3",
        actor: "guest",
        discountPercent: 18,
        message: "Would 18% work? We're flexible on dates too.",
        createdAt: addDays(isoToday(), 0),
      },
      {
        id: "co_2",
        offerId: "off_3",
        actor: "host",
        discountPercent: 8,
        message: "Thanks for reaching out! I can do 8% for those dates.",
        createdAt: addDays(isoToday(), 0),
      },
    ],
    9
  ),
  offerFrom(
    "off_4",
    "lst_24",
    "usr_13",
    15,
    3,
    10,
    "accepted",
    "host",
    "Hoping to book for a work trip.",
    [],
    30
  ),
  offerFrom(
    "off_5",
    "lst_2",
    DEMO_USER_ID,
    10,
    3,
    22,
    "declined",
    "host",
    "Any chance of a bigger discount for a last-minute long weekend?",
    [],
    40
  ),
  offerFrom(
    "off_6",
    "lst_9",
    "usr_15",
    60,
    7,
    12,
    "expired",
    "guest",
    undefined,
    [],
    72
  ),
];

export function offersForListing(listingId: string): Offer[] {
  return offers.filter((o) => o.listingId === listingId);
}

export function offersByGuest(guestId: string): Offer[] {
  return offers.filter((o) => o.guestId === guestId);
}

export function offersForHost(hostId: string): Offer[] {
  return offers.filter((o) => getListing(o.listingId)?.hostId === hostId);
}
