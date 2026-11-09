// OpsBoss — puente con HighLevel (LeadConnector API v2) para miembros del equipo.
// Acciones: status, link (buscar/crear contacto), history (mensajes y llamadas), send (SMS o email).
// Autenticación: la sesión del usuario de OpsBoss; se verifica que sea miembro con opsboss_claim().
// El token de HighLevel vive en la tabla opsboss_integrations (solo la lee el service role).

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const GHL = 'https://services.leadconnectorhq.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function memberRole(auth: string | null) {
  if (!auth?.startsWith('Bearer ')) return null;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/opsboss_claim`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) return null;
  return await r.json();
}
async function config() {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_integrations?key=eq.ghl&select=value`, { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } });
  const [row] = r.ok ? await r.json() : [];
  return row?.value ?? {};
}
function e164(p: string) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  return d ? '+' + d : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const role = await memberRole(req.headers.get('Authorization'));
    if (!role) return json({ error: 'unauthorized' }, 401);
    const cfg = await config();
    if (!cfg.token || !cfg.locationId) return json({ error: 'not_configured' }, 400);
    const L = cfg.locationId;
    const ghl = async (path: string, init: RequestInit = {}) => {
      const r = await fetch(`${GHL}${path}`, { ...init, headers: { Authorization: `Bearer ${cfg.token}`, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(body?.message || `HighLevel ${r.status}`), { status: r.status });
      return body;
    };
    const { action, ...p } = await req.json().catch(() => ({}));

    if (action === 'status') {
      const d = await ghl(`/locations/${L}`);
      return json({ ok: true, name: d.location?.name, phone: d.location?.phone });
    }

    if (action === 'link') {
      const c = p.customer ?? {};
      const phone = e164(c.phone), email = String(c.email || '').trim().toLowerCase();
      for (const q of [phone && `number=${encodeURIComponent(phone)}`, email && `email=${encodeURIComponent(email)}`].filter(Boolean)) {
        const d = await ghl(`/contacts/search/duplicate?locationId=${L}&${q}`);
        if (d.contact?.id) return json({ contactId: d.contact.id, created: false });
      }
      if (!phone && !email) return json({ error: 'no_contact_info' }, 400);
      const [firstName, ...rest] = String(c.name || '').trim().split(/\s+/);
      const d = await ghl('/contacts/', { method: 'POST', body: JSON.stringify({ locationId: L, firstName, lastName: rest.join(' '), name: c.name, phone: phone || undefined, email: email || undefined, address1: c.address || undefined, city: c.city || undefined, postalCode: c.zip || undefined, source: 'OpsBoss' }) });
      return json({ contactId: d.contact?.id, created: true });
    }

    if (action === 'history') {
      if (!p.contactId) return json({ error: 'contactId' }, 400);
      const s = await ghl(`/conversations/search?locationId=${L}&contactId=${encodeURIComponent(p.contactId)}&limit=5`);
      const conv = (s.conversations ?? [])[0];
      if (!conv) return json({ conversationId: null, messages: [] });
      const m = await ghl(`/conversations/${conv.id}/messages?limit=${Math.min(100, Number(p.limit) || 40)}`);
      const list = (m.messages?.messages ?? []).map((x: Record<string, any>) => ({
        id: x.id, type: String(x.messageType || '').replace('TYPE_', '').toLowerCase(), direction: x.direction, body: x.body ?? '', date: x.dateAdded, status: x.status,
        duration: x.meta?.call?.duration ?? null, callStatus: x.meta?.call?.status ?? null, subject: x.meta?.email?.subject ?? null,
      }));
      return json({ conversationId: conv.id, messages: list });
    }

    if (action === 'send') {
      const type = p.type === 'Email' ? 'Email' : 'SMS';
      const text = String(p.message || '').trim();
      if (!p.contactId || !text) return json({ error: 'missing' }, 400);
      if (text.length > 1600) return json({ error: 'too_long' }, 400);
      const body: Record<string, unknown> = { type, contactId: p.contactId };
      if (type === 'SMS') body.message = text;
      else { body.subject = String(p.subject || 'Message'); body.html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'); body.message = text; }
      const d = await ghl('/conversations/messages', { method: 'POST', body: JSON.stringify(body) });
      return json({ ok: true, messageId: d.messageId ?? d.id ?? null, conversationId: d.conversationId ?? null });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('ghl', (e as Error).message);
    return json({ error: 'highlevel', message: (e as Error).message, status: (e as { status?: number }).status ?? null }, 502);
  }
});
