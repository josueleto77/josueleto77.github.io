import { supabase } from "@/lib/supabase/client";

export interface HostStripeStatus {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/**
 * The signed-in host's own Stripe Connect status. Calls Stripe directly
 * (via the stripe-account-status edge function) rather than just reading
 * host_stripe_accounts, since the "Connected accounts" webhook that would
 * otherwise keep that row fresh sends v2 events our webhook can't verify
 * (see the long comment in supabase/functions/stripe-account-status).
 */
export async function fetchHostStripeStatus(): Promise<HostStripeStatus | null> {
  const { data, error } = await supabase.functions.invoke("stripe-account-status");
  if (error || !data || data.error || !data.status) return null;
  const row = data.status as {
    stripeAccountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
  return row;
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

/** Opens Stripe's hosted Billing Portal, where the user can add, change, or remove saved payment methods. */
export async function startBillingPortal(returnUrl: string): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-billing-portal", { body: { returnUrl } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { url: data?.url };
}

/**
 * Cancels a booking. If it was paid, issues a real Stripe refund computed
 * from the listing's cancellation policy (see computeRefund in
 * lib/utils/policy.ts, mirrored server-side in stripe-cancel-booking).
 */
export async function cancelBooking(bookingId: string): Promise<{ refundAmount?: number; refundPct?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-cancel-booking", { body: { bookingId } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { refundAmount: data?.refundAmount, refundPct: data?.refundPct };
}
