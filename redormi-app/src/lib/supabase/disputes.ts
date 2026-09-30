import { supabase } from "@/lib/supabase/client";
import type { Dispute, DisputeCategory } from "@/lib/types";

interface DisputeRow {
  id: string;
  booking_id: string | null;
  swap_id: string | null;
  raised_by_id: string;
  against_id: string;
  category: DisputeCategory;
  reason: string;
  status: Dispute["status"];
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

function mapRow(row: DisputeRow): Dispute {
  return {
    id: row.id,
    bookingId: row.booking_id ?? undefined,
    swapId: row.swap_id ?? undefined,
    raisedById: row.raised_by_id,
    againstId: row.against_id,
    category: row.category,
    reason: row.reason,
    status: row.status,
    resolutionNote: row.resolution_note ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** Every dispute the signed-in user is involved in, either side — RLS-scoped. */
export async function fetchMyDisputes(): Promise<Dispute[]> {
  const { data, error } = await supabase.from("disputes").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as DisputeRow[]).map(mapRow);
}

/** Every dispute — relies on the admin branch of the disputes SELECT policy. */
export async function fetchAllDisputesForAdmin(): Promise<Dispute[]> {
  return fetchMyDisputes();
}

/**
 * Opens a dispute against the other party in a booking or swap. The
 * "A participant can open a dispute against their counterpart" RLS policy
 * re-validates that raisedById/againstId are really the two participants
 * in the referenced booking/swap.
 */
export async function openDispute(input: {
  bookingId?: string;
  swapId?: string;
  againstId: string;
  category: DisputeCategory;
  reason: string;
}): Promise<{ dispute: Dispute | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { dispute: null, error: "Not signed in" };

  const { data, error } = await supabase
    .from("disputes")
    .insert({
      booking_id: input.bookingId ?? null,
      swap_id: input.swapId ?? null,
      raised_by_id: user.id,
      against_id: input.againstId,
      category: input.category,
      reason: input.reason,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return { dispute: null, error: error?.message ?? "Couldn't open that dispute — try again." };
  return { dispute: mapRow(data as DisputeRow), error: null };
}
