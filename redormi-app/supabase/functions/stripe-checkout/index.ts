// Creates a Stripe Checkout Session for one of the caller's own bookings,
// paying the host's connected account minus Redormi's service fee (a
// "destination charge" — see https://docs.stripe.com/connect/destination-charges).
// Deploy: supabase functions deploy stripe-checkout
import Stripe from "npm:stripe@^17.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2024-12-18.acacia" });

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { bookingId, successUrl, cancelUrl } = await req.json();
    if (!bookingId || !successUrl || !cancelUrl) {
      return jsonError("bookingId, successUrl, and cancelUrl are required");
    }

    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) return jsonError("Not signed in", 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!booking) return jsonError("Booking not found", 404);
    if (booking.guest_id !== user.id) return jsonError("This isn't your booking", 403);
    if (booking.payment_status === "paid") return jsonError("This booking is already paid");

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, host_id")
      .eq("id", booking.listing_id)
      .maybeSingle();
    if (!listing) return jsonError("Listing not found", 404);

    const { data: hostAccount } = await admin
      .from("host_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", listing.host_id)
      .maybeSingle();
    if (!hostAccount?.charges_enabled) {
      return jsonError("This host hasn't finished setting up payouts yet — ask them to connect Stripe first.");
    }

    const totalCents = Math.round(Number(booking.total) * 100);
    const applicationFeeCents = Math.round(Number(booking.service_fee) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Stay at ${listing.title}` },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: hostAccount.stripe_account_id },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { booking_id: booking.id },
    });

    await admin.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", booking.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
