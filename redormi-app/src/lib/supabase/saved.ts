import { supabase } from "@/lib/supabase/client";

/** Listing ids the signed-in user has saved (RLS-scoped to their own rows). */
export async function fetchSavedListingIds(): Promise<string[]> {
  const { data, error } = await supabase.from("saved_listings").select("listing_id");
  if (error || !data) return [];
  return (data as { listing_id: string }[]).map((r) => r.listing_id);
}

export async function saveListingInSupabase(userId: string, listingId: string): Promise<boolean> {
  const { error } = await supabase.from("saved_listings").insert({ user_id: userId, listing_id: listingId });
  return !error;
}

export async function unsaveListingInSupabase(userId: string, listingId: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  return !error;
}
