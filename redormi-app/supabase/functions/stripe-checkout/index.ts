// Creates a Stripe Checkout Session for one of the caller's own bookings,
// paying the host's connected account minus Redormi's service fee (a
// "destination charge" — see https://docs.stripe.com/connect/destination-charges).
// Deploy: supabase functions deploy stripe-checkout
//
// Calls the Stripe REST API directly via fetch() instead of the stripe-node
// SDK — see the long comment in stripe-connect-onboarding/index.ts for why
// (the SDK's own telemetry header breaks Deno's fetch on this runtime).
import { createClient } from "npm:@supabase/supabase-js@2";

// Inlined — see the same note in stripe-connect-onboarding/index.ts.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

function flattenParams(obj: Record<string, unknown>, prefix: string, body: URLSearchParams) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const itemKey = `${paramKey}[${i}]`;
        if (item && typeof item === "object") flattenParams(item as Record<string, unknown>, itemKey, body);
        else body.append(itemKey, String(item));
      });
    } else if (value && typeof value === "object") {
      flattenParams(value as Record<string, unknown>, paramKey, body);
    } else {
      body.append(paramKey, String(value));
    }
  }
}

async function stripeRequest(path: string, params: Record<string, unknown>) {
  const body = new URLSearchParams();
  flattenParams(params, "", body);

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe API error (${res.status})`);
  return json;
}

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

    const session = await stripeRequest("checkout/sessions", {
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
    console.error("stripe-checkout error", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
