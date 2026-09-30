import { supabase } from "@/lib/supabase/client";
import type { AvailabilityWindow } from "@/lib/types";

export interface BlockedDateRow {
  id: string;
  listingId: string;
  start: string;
  end: string;
}

interface Row {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
}

function mapRow(row: Row): BlockedDateRow {
  return { id: row.id, listingId: row.listing_id, start: row.start_date, end: row.end_date };
}

/** A single listing's blocked windows, with row ids so the host can remove one. */
export async function fetchBlockedDatesForListing(listingId: string): Promise<BlockedDateRow[]> {
  const { data, error } = await supabase
    .from("listing_blocked_dates")
    .select("*")
    .eq("listing_id", listingId)
    .order("start_date");
  if (error || !data) return [];
  return (data as Row[]).map(mapRow);
}

/**
 * Blocked windows for many listings at once, keyed by listing id — used to
 * populate Listing.availability (publicly readable, no ids needed there)
 * without an N+1 query per listing.
 */
export async function fetchBlockedDatesForListings(listingIds: string[]): Promise<Map<string, AvailabilityWindow[]>> {
  const map = new Map<string, AvailabilityWindow[]>();
  if (listingIds.length === 0) return map;
  const { data, error } = await supabase
    .from("listing_blocked_dates")
    .select("listing_id, start_date, end_date")
    .in("listing_id", listingIds);
  if (error || !data) return map;
  for (const row of data as { listing_id: string; start_date: string; end_date: string }[]) {
    const windows = map.get(row.listing_id) ?? [];
    windows.push({ start: row.start_date, end: row.end_date, blocked: true });
    map.set(row.listing_id, windows);
  }
  return map;
}

/**
 * Blocks a date range on the host's own listing. The
 * prevent_blocking_confirmed_dates trigger rejects this if it overlaps an
 * existing non-cancelled booking, so this can fail with a real reason.
 */
export async function blockDates(listingId: string, start: string, end: string): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("listing_blocked_dates")
    .insert({ listing_id: listingId, start_date: start, end_date: end })
    .select("id")
    .maybeSingle();
  if (error || !data) return { id: null, error: error?.message ?? "Couldn't block those dates — try again." };
  return { id: data.id, error: null };
}

export async function unblockDates(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("listing_blocked_dates").delete().eq("id", id);
  return { error: error?.message ?? null };
}
