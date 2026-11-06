// OpsBoss — crea una sesión de Stripe Checkout para pagar una factura desde el portal del cliente.
// La autenticación es el token del portal (no hay sesión de usuario), por eso verify_jwt = false.
// El monto SIEMPRE se calcula aquí, en el servidor, a partir de la factura guardada.
// Secretos requeridos (Supabase → Edge Functions → Secrets): STRIPE_SECRET_KEY
// Opcional: OPSBOSS_PORTAL_URL (por defecto la página publicada en GitHub Pages).

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PORTAL = Deno.env.get('OPSBOSS_PORTAL_URL') ?? 'https://josueleto77.github.io/opsboss/portal.html';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function db(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } });
  if (!r.ok) throw new Error(`db ${r.status}`);
  return await r.json();
}
const n = (v: unknown) => { const x = parseFloat(String(v)); return Number.isFinite(x) ? x : 0; };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const { token } = await req.json().catch(() => ({}));
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return json({ error: 'invalid' }, 400);
    if (!STRIPE_KEY) return json({ error: 'not_configured' }, 503);

    const [link] = await db(`opsboss_portal_links?token=eq.${token}&select=kind,record_id,revoked,expires_at`);
    if (!link || link.kind !== 'invoice' || link.revoked || new Date(link.expires_at) < new Date()) return json({ error: 'invalid' }, 404);

    const [invRow] = await db(`opsboss_records?coll=eq.invoices&id=eq.${encodeURIComponent(link.record_id)}&select=data`);
    const [setRow] = await db(`opsboss_records?coll=eq.settings&id=eq.main&select=data`);
    const inv = invRow?.data, s = setRow?.data ?? {};
    if (!inv) return json({ error: 'missing' }, 404);
    if (!s.paymentsEnabled) return json({ error: 'disabled' }, 403);
    if (inv.status === 'void') return json({ error: 'void' }, 400);

    const tax = n(s.taxRate);
    const total = (inv.items ?? []).reduce((a: number, i: { qty: unknown; price: unknown }) => a + n(i.qty) * n(i.price), 0) * (1 + tax / 100);
    const paid = (inv.payments ?? []).reduce((a: number, p: { amount: unknown }) => a + n(p.amount), 0);
    const cents = Math.round((total - paid) * 100);
    if (cents < 50) return json({ error: 'nothing_due' }, 400);

    const [custRow] = await db(`opsboss_records?coll=eq.customers&id=eq.${encodeURIComponent(inv.customerId ?? '')}&select=data`);
    const email = custRow?.data?.email;

    const p = new URLSearchParams();
    p.set('mode', 'payment');
    p.set('success_url', `${PORTAL}?t=${token}&paid=1`);
    p.set('cancel_url', `${PORTAL}?t=${token}`);
    p.set('line_items[0][quantity]', '1');
    p.set('line_items[0][price_data][currency]', 'usd');
    p.set('line_items[0][price_data][unit_amount]', String(cents));
    p.set('line_items[0][price_data][product_data][name]', `${inv.kind === 'deposit' ? 'Depósito' : 'Factura'} ${inv.number} — ${s.company ?? 'OpsBoss'}`);
    p.set('metadata[invoice_id]', link.record_id);
    p.set('metadata[token]', token);
    p.set('payment_intent_data[metadata][invoice_id]', link.record_id);
    p.set('payment_intent_data[description]', `${inv.number} — ${s.company ?? ''}`);
    if (typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) p.set('customer_email', email);

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p,
    });
    const out = await r.json();
    if (!r.ok) { console.error('stripe', out?.error?.message); return json({ error: 'stripe', message: out?.error?.message }, 502); }
    return json({ url: out.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'server' }, 500);
  }
});
