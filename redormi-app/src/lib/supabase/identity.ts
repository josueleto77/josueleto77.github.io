import { supabase } from "@/lib/supabase/client";

export interface IdentityVerificationStatus {
  status: string;
  isVerified: boolean;
}

/** The signed-in user's own identity verification status (RLS-scoped to their row). */
export async function fetchIdentityVerificationStatus(userId: string): Promise<IdentityVerificationStatus | null> {
  const { data, error } = await supabase.from("identity_verifications").select("status").eq("user_id", userId).maybeSingle();
  if (error) return null;
  if (!data) return { status: "not_started", isVerified: false };
  return { status: data.status, isVerified: data.status === "Approved" };
}

/** Starts (or resumes) Didit identity verification; returns the hosted URL to redirect the user to. */
export async function startIdentityVerification(returnUrl: string): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("didit-create-session", { body: { returnUrl } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { url: data?.url };
}
