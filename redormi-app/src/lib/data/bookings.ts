import type { Booking } from "@/lib/types";
import { getListing } from "@/lib/data/listings";
import { DEMO_USER_ID } from "@/lib/data/users";
import { priceBreakdown } from "@/lib/utils/pricing";
import { addDays, nightsBetween } from "@/lib/utils/format";
import { seedToday as isoToday } from "@/lib/utils/seedClock";

interface BookingSeed {
  id: string;
  listingId: string;
  guestId: string;
  checkInOffset: number;
  nights: number;
  guests: number;
  status: Booking["status"];
  fromOfferId?: string;
  discountPercent?: number;
}

const seeds: BookingSeed[] = [
  { id: "bk_1", listingId: "lst_24", guestId: "usr_13", checkInOffset: 15, nights: 3, guests: 2, status: "confirmed", fromOfferId: "off_4", discountPercent: 10 },
  { id: "bk_2", listingId: "lst_6", guestId: DEMO_USER_ID, checkInOffset: -40, nights: 6, guests: 2, status: "completed" },
  { id: "bk_3", listingId: "lst_1", guestId: DEMO_USER_ID, checkInOffset: 33, nights: 5, guests: 6, status: "held" },
  { id: "bk_4", listingId: "lst_9", guestId: "usr_15", checkInOffset: -80, nights: 5, guests: 2, status: "completed" },
  { id: "bk_5", listingId: "lst_23", guestId: "usr_11", checkInOffset: -12, nights: 4, guests: 2, status: "completed" },
  { id: "bk_6", listingId: "lst_11", guestId: DEMO_USER_ID, checkInOffset: -110, nights: 7, guests: 3, status: "completed" },
];

export const bookings: Booking[] = seeds.map((s) => {
  const listing = getListing(s.listingId)!;
  const checkIn = addDays(isoToday(), s.checkInOffset);
  const checkOut = addDays(isoToday(), s.checkInOffset + s.nights);
  const b = priceBreakdown(listing.pricing, s.nights, s.discountPercent ?? 0);
  return {
    id: s.id,
    listingId: s.listingId,
    guestId: s.guestId,
    checkIn,
    checkOut,
    guests: s.guests,
    nights: nightsBetween(checkIn, checkOut),
    nightlyRate: b.nightlyRate,
    subtotal: b.subtotal,
    cleaningFee: b.cleaningFee,
    serviceFee: b.serviceFee,
    taxes: b.taxes,
    total: b.total,
    status: s.status,
    fromOfferId: s.fromOfferId,
    extraServiceOrderIds: [],
    createdAt: addDays(checkIn, -14),
  };
});

export function bookingsForGuest(guestId: string): Booking[] {
  return bookings.filter((b) => b.guestId === guestId);
}

export function bookingsForHost(hostId: string): Booking[] {
  return bookings.filter((b) => getListing(b.listingId)?.hostId === hostId);
}
