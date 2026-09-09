import { supabase } from "@/lib/supabase/client";
import type { Role, User } from "@/lib/types";

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  roles: Role[];
  is_host: boolean;
  is_switch_member: boolean;
  member_since: string;
}

export function mapProfileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name || row.email.split("@")[0],
    email: row.email,
    phone: row.phone ?? undefined,
    avatar: row.avatar_url || `https://i.pravatar.cc/150?u=${row.id}`,
    dateOfBirth: row.date_of_birth ?? undefined,
    address: row.address ?? undefined,
    roles: row.roles?.length ? row.roles : ["traveler"],
    isHost: row.is_host,
    isSwitchMember: row.is_switch_member,
    verification: { identity: "unverified", email: true, phone: !!row.phone },
    memberSince: row.member_since?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    city: row.city ?? undefined,
    country: row.country ?? undefined,
  };
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return mapProfileToUser(data as ProfileRow);
}

export async function upsertProfile(userId: string, patch: Partial<ProfileRow>): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapProfileToUser(data as ProfileRow);
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ userId: string | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { userId: null, error: error.message };
  return { userId: data.user?.id ?? null, error: null };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ userId: string | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { userId: null, error: error.message };
  return { userId: data.user?.id ?? null, error: null };
}

export async function signOutSupabase(): Promise<void> {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string, redirectTo: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error?.message ?? null };
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
