import { supabase } from "@/lib/supabase/client";
import type { User } from "@/lib/types";
import { mapProfileToUser, type ProfileRow } from "@/lib/supabase/auth";

/** Every profile — already publicly readable (profiles has an "everyone can SELECT" policy). */
export async function fetchAllProfiles(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("member_since", { ascending: false });
  if (error || !data) return [];
  return (data as ProfileRow[]).map(mapProfileToUser);
}

type ModerationAction =
  | "remove_listing"
  | "restore_listing"
  | "suspend_user"
  | "unsuspend_user"
  | "mark_dispute_reviewing"
  | "resolve_dispute";

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

export interface UserPowers {
  isAdmin: boolean;
  isHost: boolean;
  isSwitchMember: boolean;
}

/** Invites a new user by email (Supabase sends the invite email) and sets their initial powers. */
export async function inviteUser(
  email: string,
  name: string,
  powers: UserPowers
): Promise<{ user: User | null; error: string | null }> {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
  const { data, error } = await supabase.functions.invoke("admin-moderate", {
    body: { action: "invite_user", email, name, redirectTo, ...powers },
  });
  if (error) return { user: null, error: error.message };
  if (data?.error) return { user: null, error: data.error };
  return { user: data.profile ? mapProfileToUser(data.profile as ProfileRow) : null, error: null };
}

/** Grants or revokes a user's admin/host/switch-member powers (full replace of all three). */
export async function updateUserPowers(targetId: string, powers: UserPowers): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("admin-moderate", {
    body: { action: "update_user_powers", targetId, ...powers },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { error: null };
}
