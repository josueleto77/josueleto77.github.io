// Receives Stripe webhook events. Register this URL in the Stripe
// Dashboard (Developers -> Webhooks) for checkout.session.completed and
// account.updated. Stripe's Accounts v2 event-scope routing requires two
// separate event destinations for these ("Your account" vs "Connected
// accounts"), and each destination has its OWN signing secret — so this
// tries both: STRIPE_WEBHOOK_SECRET (the "Your account" / checkout
// destination) and STRIPE_WEBHOOK_SECRET_CONNECT (the "Connected
// accounts" / account.updated destination). This function must NOT
// require a Supabase auth JWT (Stripe calls it directly) — set
// `verify_jwt = false` for it in supabase/config.toml, which this repo
// already does.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// stripe@^17 fails on this runtime with "'headers' of 'RequestInit' is not
// a valid ByteString" — Supabase's own examples pin stripe@^22, which
// doesn't have this Deno fetch-client incompatibility.
import Stripe from "npm:stripe@^22";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
const webhookSecrets = [Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "", Deno.env.get("STRIPE_WEBHOOK_SECRET_CONNECT") ?? ""].filter(
  Boolean
);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event | undefined;
  let lastError: unknown;
  if (!signature) {
    console.error("Webhook signature verification failed", "Missing Stripe-Signature header");
    return new Response("Invalid signature", { status: 400 });
  }
  for (const secret of webhookSecrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!event) {
    console.error("Webhook signature verification failed", lastError);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        await admin
          .from("bookings")
          .update({
            payment_status: "paid",
            status: "confirmed",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          })
          .eq("id", bookingId);
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await admin
        .from("host_stripe_accounts")
        .update({
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
          details_submitted: account.details_submitted ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id);
      break;
    }
    default:
      // Other event types aren't handled yet — ack so Stripe stops retrying.
      break;
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
