// Returns the signed-in host's live Stripe Connect account status,
// fetched directly from Stripe's Accounts API and written back to
// host_stripe_accounts. This exists because the "Connected accounts"
// webhook destination Stripe's newer dashboard creates sends v2 "thin"
// events (v2.core.account[...]), which use a different signing scheme
// than stripe.webhooks.constructEventAsync can verify — so account.updated
// deliveries never validate. Polling the account directly on page load
// sidesteps that entirely; the account.updated webhook is left wired up
// in case Stripe ever routes classic v1 events to it too.
// Deploy: supabase functions deploy stripe-account-status
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: existing } = await admin
      .from("host_stripe_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing?.stripe_account_id) {
      return new Response(JSON.stringify({ status: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.stripe.com/v1/accounts/${existing.stripe_account_id}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const account = await res.json();
    if (!res.ok) throw new Error(account?.error?.message ?? `Stripe API error (${res.status})`);

    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);

    await admin
      .from("host_stripe_accounts")
      .update({
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        details_submitted: detailsSubmitted,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        status: {
          stripeAccountId: existing.stripe_account_id,
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("stripe-account-status error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
