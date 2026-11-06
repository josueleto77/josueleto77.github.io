// OpsBoss — webhook de Stripe: registra en la factura los pagos hechos desde el portal.
// Stripe no envía JWT, por eso verify_jwt = false; la autenticidad se valida con la firma Stripe-Signature.
// Secretos requeridos: STRIPE_WEBHOOK_SECRET (whsec_...)
// Eventos a suscribir en Stripe: checkout.session.completed, checkout.session.async_payment_succeeded

const WH_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const enc = new TextEncoder();

async function validSignature(raw: string, header: string | null) {
  if (!header || !WH_SECRET) return false;
  const parts = header.split(',').map((x) => x.split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(WH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('stripe-signature')))) return new Response('bad signature', { status: 400 });

  const event = JSON.parse(raw);
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return new Response('ignored', { status: 200 });

  const s = event.data?.object ?? {};
  const invoiceId = s.metadata?.invoice_id;
  if (!invoiceId || s.payment_status !== 'paid') return new Response('pending', { status: 200 });

  const r = await fetch(`${SB_URL}/rest/v1/rpc/opsboss_portal_record_payment`, {
    method: 'POST',
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_invoice_id: invoiceId, p_amount: (s.amount_total ?? 0) / 100, p_ref: s.id, p_method: 'Pago en línea (Stripe)' }),
  });
  if (!r.ok) { console.error('record payment', r.status, await r.text()); return new Response('db error', { status: 500 }); }
  return new Response('ok', { status: 200 });
});
