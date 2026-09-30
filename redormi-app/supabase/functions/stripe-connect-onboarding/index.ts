// Creates (or reuses) a Stripe Connect Express account for the signed-in
// host and returns a one-time onboarding link URL to redirect them to.
// Deploy: supabase functions deploy stripe-connect-onboarding
// Requires the STRIPE_SECRET_KEY secret (supabase secrets set STRIPE_SECRET_KEY=sk_...).
//
// This calls the Stripe REST API directly via fetch() instead of the
// stripe-node SDK: under Supabase's Deno edge runtime, stripe-node's
// automatic telemetry/user-agent header (which shells out to `uname -a`
// via Node's child_process compat shim) comes back mangled, and Deno's
// fetch rejects the resulting header as "not a valid ByteString" on every
// single API call (stripe@17 and stripe@22 both hit this). A hand-rolled
// client sidesteps it by only ever sending headers we set ourselves.
import { createClient } from "npm:@supabase/supabase-js@2";

// Inlined rather than imported from ../_shared/cors.ts — the MCP-based
// deploy path (used to actually ship this) bundles each function's files
// under its own root and doesn't resolve a sibling function's relative
// "../_shared" import, so keep this in sync across all three functions.
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
      const account = await stripeRequest("accounts", {
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

    const accountLink = await stripeRequest("account_links", {
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-connect-onboarding error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
