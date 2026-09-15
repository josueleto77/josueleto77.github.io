import { supabase } from "@/lib/supabase/client";

export interface HostStripeStatus {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface HostStripeAccountRow {
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

/** The signed-in host's own Stripe Connect status, if they've started onboarding. */
export async function fetchHostStripeStatus(): Promise<HostStripeStatus | null> {
  const { data, error } = await supabase
    .from("host_stripe_accounts")
    .select("stripe_account_id, charges_enabled, payouts_enabled, details_submitted")
    .maybeSingle();
  if (error || !data) return null;
  const row = data as HostStripeAccountRow;
  return {
    stripeAccountId: row.stripe_account_id,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    detailsSubmitted: row.details_submitted,
  };
}

/** Starts (or resumes) Stripe Connect Express onboarding; returns the URL to redirect the host to. */
export async function startConnectOnboarding(returnUrl: string): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding", { body: { returnUrl } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { url: data?.url };
}

/** Creates a Stripe Checkout session for a booking; returns the URL to redirect the guest to. */
export async function startBookingCheckout(
  bookingId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { bookingId, successUrl, cancelUrl },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { url: data?.url };
}
