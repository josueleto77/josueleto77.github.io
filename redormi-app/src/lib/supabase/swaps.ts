import { supabase } from "@/lib/supabase/client";
import type { SwapAgreement, SwapProposal, SwapStatus } from "@/lib/types";

interface SwapRow {
  id: string;
  from_listing_id: string;
  from_owner_id: string;
  to_listing_id: string;
  to_owner_id: string;
  proposed_start: string;
  proposed_end: string;
  message: string | null;
  status: SwapStatus;
  tier_gap: number;
  processing_fee_per_owner: number;
  created_at: string;
}

interface SwapAgreementRow {
  id: string;
  swap_id: string;
  signed_by_from: boolean;
  signed_by_to: boolean;
  add_on_ids: string[];
  signed_at: string | null;
  version: string;
}

function mapSwap(row: SwapRow): SwapProposal {
  return {
    id: row.id,
    fromListingId: row.from_listing_id,
    fromOwnerId: row.from_owner_id,
    toListingId: row.to_listing_id,
    toOwnerId: row.to_owner_id,
    proposedStart: row.proposed_start,
    proposedEnd: row.proposed_end,
    message: row.message ?? undefined,
    status: row.status,
    tierGap: row.tier_gap,
    processingFeePerOwner: row.processing_fee_per_owner,
    createdAt: row.created_at,
  };
}

function mapAgreement(row: SwapAgreementRow): SwapAgreement {
  return {
    id: row.id,
    swapId: row.swap_id,
    signedByFrom: row.signed_by_from,
    signedByTo: row.signed_by_to,
    addOnIds: row.add_on_ids ?? [],
    signedAt: row.signed_at ?? undefined,
    version: row.version,
  };
}

/** Swaps + agreements visible to the signed-in user (RLS-scoped to either owner). */
export async function fetchSwapsForUser(): Promise<{ swaps: SwapProposal[]; agreements: SwapAgreement[] }> {
  const [swapsRes, agreementsRes] = await Promise.all([
    supabase.from("swaps").select("*").order("created_at", { ascending: false }),
    supabase.from("swap_agreements").select("*"),
  ]);
  return {
    swaps: ((swapsRes.data ?? []) as SwapRow[]).map(mapSwap),
    agreements: ((agreementsRes.data ?? []) as SwapAgreementRow[]).map(mapAgreement),
  };
}

export async function createSwapInSupabase(
  swap: Omit<SwapProposal, "id" | "createdAt" | "status">
): Promise<SwapProposal | null> {
  const { data, error } = await supabase
    .from("swaps")
    .insert({
      from_listing_id: swap.fromListingId,
      from_owner_id: swap.fromOwnerId,
      to_listing_id: swap.toListingId,
      to_owner_id: swap.toOwnerId,
      proposed_start: swap.proposedStart,
      proposed_end: swap.proposedEnd,
      message: swap.message,
      tier_gap: swap.tierGap,
      processing_fee_per_owner: swap.processingFeePerOwner,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapSwap(data as SwapRow);
}

export async function respondSwapInSupabase(swapId: string, status: SwapStatus): Promise<SwapProposal | null> {
  const { data, error } = await supabase.from("swaps").update({ status }).eq("id", swapId).select("*").maybeSingle();
  if (error || !data) return null;
  return mapSwap(data as SwapRow);
}

/** Upserts the final, already-merged agreement state (see AppDataContext's signAgreement, which computes it locally first). */
export async function upsertSwapAgreementInSupabase(agreement: {
  swapId: string;
  signedByFrom: boolean;
  signedByTo: boolean;
  addOnIds: string[];
  signedAt?: string;
  version: string;
  status: SwapStatus;
}): Promise<SwapAgreement | null> {
  const [agreementRes] = await Promise.all([
    supabase
      .from("swap_agreements")
      .upsert(
        {
          swap_id: agreement.swapId,
          signed_by_from: agreement.signedByFrom,
          signed_by_to: agreement.signedByTo,
          add_on_ids: agreement.addOnIds,
          signed_at: agreement.signedAt ?? null,
          version: agreement.version,
        },
        { onConflict: "swap_id" }
      )
      .select("*")
      .maybeSingle(),
    supabase.from("swaps").update({ status: agreement.status }).eq("id", agreement.swapId),
  ]);
  if (agreementRes.error || !agreementRes.data) return null;
  return mapAgreement(agreementRes.data as SwapAgreementRow);
}
