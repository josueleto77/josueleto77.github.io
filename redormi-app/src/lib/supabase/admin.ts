import { supabase } from "@/lib/supabase/client";
import type { User } from "@/lib/types";
import { mapProfileToUser, type ProfileRow } from "@/lib/supabase/auth";

/** Every profile — already publicly readable (profiles has an "everyone can SELECT" policy). */
export async function fetchAllProfiles(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("member_since", { ascending: false });
  if (error || !data) return [];
  return (data as ProfileRow[]).map(mapProfileToUser);
}

type ModerationAction = "remove_listing" | "restore_listing" | "suspend_user" | "unsuspend_user";

/**
 * Every admin action re-verifies profiles.is_admin server-side (see
 * admin-moderate) before doing anything — a non-admin calling this just
 * gets a 403, regardless of what the client thinks currentUser.isAdmin is.
 */
export async function moderate(action: ModerationAction, targetId: string, reason?: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("admin-moderate", { body: { action, targetId, reason } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { error: null };
}
