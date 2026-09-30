import { supabase } from "@/lib/supabase/client";
import type { CounterOffer, Offer, OfferStatus } from "@/lib/types";

interface OfferRow {
  id: string;
  listing_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  discount_percent: number;
  resulting_nightly: number;
  resulting_total: number;
  message: string | null;
  status: OfferStatus;
  expires_at: string;
  last_actor: "guest" | "host";
  history: CounterOffer[];
  created_at: string;
}

function mapRowToOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    listingId: row.listing_id,
    guestId: row.guest_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    discountPercent: row.discount_percent,
    resultingNightly: row.resulting_nightly,
    resultingTotal: row.resulting_total,
    message: row.message ?? undefined,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    history: row.history ?? [],
    lastActor: row.last_actor,
  };
}

/**
 * Every offer visible to the signed-in user. No explicit guest/host filter
 * needed — the "Guest or host can view an offer" RLS policy already scopes
 * this to rows where the caller is the guest or owns the listing.
 */
export async function fetchOffersForUser(): Promise<Offer[]> {
  const { data, error } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as OfferRow[]).map(mapRowToOffer);
}

export async function createOfferInSupabase(
  offer: Omit<Offer, "id" | "createdAt" | "status" | "expiresAt" | "history" | "lastActor">,
  expiresAt: string
): Promise<Offer | null> {
  const { data, error } = await supabase
    .from("offers")
    .insert({
      listing_id: offer.listingId,
      guest_id: offer.guestId,
      check_in: offer.checkIn,
      check_out: offer.checkOut,
      discount_percent: offer.discountPercent,
      resulting_nightly: offer.resultingNightly,
      resulting_total: offer.resultingTotal,
      message: offer.message,
      expires_at: expiresAt,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToOffer(data as OfferRow);
}

export async function counterOfferInSupabase(
  offerId: string,
  actor: "guest" | "host",
  discountPercent: number,
  resultingNightly: number,
  resultingTotal: number,
  history: CounterOffer[]
): Promise<Offer | null> {
  const { data, error } = await supabase
    .from("offers")
    .update({
      status: "countered",
      discount_percent: discountPercent,
      resulting_nightly: resultingNightly,
      resulting_total: resultingTotal,
      last_actor: actor,
      history,
    })
    .eq("id", offerId)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToOffer(data as OfferRow);
}

export async function respondOfferInSupabase(
  offerId: string,
  status: Extract<OfferStatus, "accepted" | "declined">
): Promise<Offer | null> {
  const { data, error } = await supabase.from("offers").update({ status }).eq("id", offerId).select("*").maybeSingle();
  if (error || !data) return null;
  return mapRowToOffer(data as OfferRow);
}
