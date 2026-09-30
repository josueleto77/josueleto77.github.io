import { supabase } from "@/lib/supabase/client";
import type { AcceptanceRecord } from "@/lib/types";

interface AcceptanceRow {
  id: string;
  user_id: string;
  document_slug: string;
  version: string;
  accepted_at: string;
  ip: string | null;
}

function mapRow(row: AcceptanceRow): AcceptanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    documentSlug: row.document_slug,
    version: row.version,
    acceptedAt: row.accepted_at,
    ip: row.ip ?? "",
  };
}

/** The signed-in user's own legal-acceptance audit trail (RLS-scoped). */
export async function fetchAcceptancesForUser(): Promise<AcceptanceRecord[]> {
  const { data, error } = await supabase.from("legal_acceptances").select("*");
  if (error || !data) return [];
  return (data as AcceptanceRow[]).map(mapRow);
}

export async function recordAcceptanceInSupabase(
  userId: string,
  documentSlug: string,
  version: string
): Promise<AcceptanceRecord | null> {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .insert({ user_id: userId, document_slug: documentSlug, version })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as AcceptanceRow);
}
