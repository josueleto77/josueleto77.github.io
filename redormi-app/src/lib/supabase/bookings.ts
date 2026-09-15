import { supabase } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types";

interface BookingRow {
  id: string;
  listing_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  nightly_rate: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total: number;
  status: Booking["status"];
  from_offer_id: string | null;
  created_at: string;
  payment_status: Booking["paymentStatus"];
  stripe_checkout_session_id: string | null;
}

function mapRowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    guestId: row.guest_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    nights: row.nights,
    nightlyRate: row.nightly_rate,
    subtotal: row.subtotal,
    cleaningFee: row.cleaning_fee,
    serviceFee: row.service_fee,
    taxes: row.taxes,
    total: row.total,
    status: row.status,
    fromOfferId: row.from_offer_id ?? undefined,
    extraServiceOrderIds: [],
    createdAt: row.created_at,
    paymentStatus: row.payment_status,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
  };
}

/** Every booking visible to the signed-in user (guest, or host of the listing) — scoped by RLS. */
export async function fetchBookingsForUser(): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as BookingRow[]).map(mapRowToBooking);
}

export async function createBookingInSupabase(
  booking: Omit<Booking, "id" | "createdAt" | "status" | "extraServiceOrderIds" | "paymentStatus" | "stripeCheckoutSessionId">
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      listing_id: booking.listingId,
      guest_id: booking.guestId,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      guests: booking.guests,
      nights: booking.nights,
      nightly_rate: booking.nightlyRate,
      subtotal: booking.subtotal,
      cleaning_fee: booking.cleaningFee,
      service_fee: booking.serviceFee,
      taxes: booking.taxes,
      total: booking.total,
      from_offer_id: booking.fromOfferId,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToBooking(data as BookingRow);
}

export async function updateBookingStatusInSupabase(
  bookingId: string,
  status: Booking["status"]
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToBooking(data as BookingRow);
}
