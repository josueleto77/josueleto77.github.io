import { supabase } from "@/lib/supabase/client";

export async function requestAccountDeletion(
  email: string,
  reason: string,
  userId?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({ email, reason: reason || null, user_id: userId ?? null });
  if (error) return { error: error.message };
  return { error: null };
}
