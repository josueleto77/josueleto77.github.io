import { supabase } from "@/lib/supabase/client";
import type { LastMinuteDeal } from "@/lib/types";

interface DealRow {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  discount_percent: number;
  expires_at: string;
  matched_area: string | null;
  created_at: string;
}

function mapDeal(row: DealRow): LastMinuteDeal {
  return {
    id: row.id,
    listingId: row.listing_id,
    start: row.start_date,
    end: row.end_date,
    discountPercent: row.discount_percent,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    matchedArea: row.matched_area ?? undefined,
  };
}

/** All published deals — public, like listings, so this isn't gated behind a session. */
export async function fetchDeals(): Promise<LastMinuteDeal[]> {
  const { data, error } = await supabase.from("last_minute_deals").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as DealRow[]).map(mapDeal);
}

export async function createDealInSupabase(
  deal: Omit<LastMinuteDeal, "id" | "createdAt">
): Promise<LastMinuteDeal | null> {
  const { data, error } = await supabase
    .from("last_minute_deals")
    .insert({
      listing_id: deal.listingId,
      start_date: deal.start,
      end_date: deal.end,
      discount_percent: deal.discountPercent,
      expires_at: deal.expiresAt,
      matched_area: deal.matchedArea,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapDeal(data as DealRow);
}
