// Creates (or reuses) a Stripe Connect Express account for the signed-in
// host and returns a one-time onboarding link URL to redirect them to.
// Deploy: supabase functions deploy stripe-connect-onboarding
// Requires the STRIPE_SECRET_KEY secret (supabase secrets set STRIPE_SECRET_KEY=sk_...).
import Stripe from "npm:stripe@^17.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2024-12-18.acacia" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { returnUrl } = await req.json();
    if (!returnUrl || typeof returnUrl !== "string") {
      return new Response(JSON.stringify({ error: "returnUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify the caller from their session JWT (forwarded automatically
    // by supabase.functions.invoke on the client).
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

    // Service-role client: host_stripe_accounts has no client-writable RLS
    // policy on purpose, so this table can only be written from here.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: existing } = await admin
      .from("host_stripe_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id as string | undefined;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await admin.from("host_stripe_accounts").insert({ user_id: user.id, stripe_account_id: accountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
