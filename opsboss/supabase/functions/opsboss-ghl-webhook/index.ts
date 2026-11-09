// OpsBoss — recibe avisos de los workflows de HighLevel (acción "Webhook").
// URL: /functions/v1/opsboss-ghl-webhook?key=<clave>&event=lead|reply|call[&division=solar|roofing|hvac]
//   lead  → crea (o reutiliza) el cliente y un lead en el pipeline "Marketing Leads", etapa "Warm Leads".
//   reply → registra la respuesta del cliente y crea una tarea para contestarle.
//   call  → registra la llamada en la actividad (y tarea si fue perdida).
// La clave se valida contra opsboss_integrations (se ve en OpsBoss → Settings → HighLevel).

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const H = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
const ok = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);
const now = () => new Date().toISOString();
const ymd = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10);

async function rows(coll: string, filter = '') {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_records?coll=eq.${coll}${filter}&select=data`, { headers: H });
  return r.ok ? (await r.json()).map((x: { data: unknown }) => x.data) : [];
}
async function upsert(list: { coll: string; id: string; data: unknown }[]) {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_records`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(list) });
  if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()));
}
const pick = (o: Record<string, any>, ...keys: string[]) => { for (const k of keys) { const v = k.split('.').reduce((a: any, x) => (a == null ? a : a[x]), o); if (v != null && v !== '') return v; } return ''; };

function guessDivision(q: string | null, text: string) {
  if (q && ['solar', 'roofing', 'hvac'].includes(q)) return q;
  const t = text.toLowerCase();
  if (/roof|shingle|gutter|techo/.test(t)) return 'roofing';
  if (/hvac|heat pump|\bac\b|a\/c|furnace|mini.?split|cooling|heating/.test(t)) return 'hvac';
  return 'solar';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok({ error: 'method' }, 405);
  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? '';
  const event = url.searchParams.get('event') ?? 'lead';
  const cfgR = await fetch(`${SB_URL}/rest/v1/opsboss_integrations?key=eq.ghl&select=value`, { headers: H });
  const [cfg] = cfgR.ok ? await cfgR.json() : [];
  if (!key || key !== cfg?.value?.webhookKey) return ok({ error: 'unauthorized' }, 401);

  let b: Record<string, any> = {};
  try { b = await req.json(); } catch { return ok({ error: 'bad_json' }, 400); }

  const ghlId = String(pick(b, 'contact_id', 'contactId', 'contact.id', 'id'));
  const first = String(pick(b, 'first_name', 'firstName', 'contact.firstName'));
  const last = String(pick(b, 'last_name', 'lastName', 'contact.lastName'));
  const name = String(pick(b, 'full_name', 'fullName', 'name', 'contact.name') || `${first} ${last}`.trim() || 'HighLevel contact');
  const phone = String(pick(b, 'phone', 'contact.phone'));
  const email = String(pick(b, 'email', 'contact.email')).toLowerCase();
  const tags = Array.isArray(b.tags) ? b.tags : String(b.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const msgBody = String(pick(b, 'message.body', 'message', 'body', 'customData.message'));
  const source = String(pick(b, 'contact_source', 'source', 'attributionSource.medium'));

  try {
    const customers = await rows('customers');
    let c = customers.find((x: any) => ghlId && x.ghlId === ghlId)
      || customers.find((x: any) => phone && digits(x.phone) && digits(x.phone) === digits(phone))
      || customers.find((x: any) => email && String(x.email || '').toLowerCase() === email);
    const writes: { coll: string; id: string; data: unknown }[] = [];
    const activity = (text: string) => { const id = uid(); writes.push({ coll: 'activity', id, data: { id, text, ts: now(), by: 'HighLevel' } }); };

    if (event === 'lead') {
      if (!c) {
        c = { id: uid(), name, phone, email, address: String(pick(b, 'address1', 'full_address', 'contact.address1')), city: String(pick(b, 'city', 'contact.city')), zip: String(pick(b, 'postal_code', 'postalCode', 'contact.postalCode')), source: 'HighLevel', tags, createdAt: now(), notes: '', property: {}, equipment: [], ghlId };
        writes.push({ coll: 'customers', id: c.id, data: c });
      } else if (ghlId && !c.ghlId) { c.ghlId = ghlId; writes.push({ coll: 'customers', id: c.id, data: c }); }
      const leads = await rows('leads');
      const recent = leads.find((l: any) => l.customerId === c.id && !['won', 'lost', 'notint'].includes(l.stage) && Date.now() - new Date(l.createdAt).getTime() < 30 * 864e5);
      if (recent) { activity(`HighLevel: ${c.name} came in again (lead already open)`); await upsert(writes); return ok({ ok: true, duplicate: true, leadId: recent.id }); }
      const division = guessDivision(url.searchParams.get('division'), [tags.join(' '), source, msgBody, String(pick(b, 'workflow.name', 'customData.service'))].join(' '));
      const title = String(pick(b, 'customData.title', 'customData.service', 'opportunity_name', 'workflow.name') || `${division === 'roofing' ? 'Roofing' : division === 'hvac' ? 'HVAC' : 'Solar'} inquiry`);
      const id = uid();
      writes.push({ coll: 'leads', id, data: { id, customerId: c.id, division, title, value: Number(pick(b, 'customData.value', 'lead_value')) || 0, stage: 'warm', stageAt: now(), source: 'HighLevel', createdAt: now(), next: ymd(), notes: [source && `Source: ${source}`, msgBody].filter(Boolean).join('\n'), via: 'highlevel' } });
      activity(`📥 New marketing lead from HighLevel: ${c.name}`);
      await upsert(writes);
      return ok({ ok: true, leadId: id, customerId: c.id });
    }

    if (event === 'reply' || event === 'call') {
      const who = c?.name || name || phone;
      const callStatus = String(pick(b, 'call.status', 'customData.callStatus', 'status')).toLowerCase();
      const missed = event === 'call' && /miss|no.?answer|voicemail|busy|fail/.test(callStatus);
      activity(event === 'reply' ? `💬 ${who} replied: ${msgBody.slice(0, 200)}` : `📞 Call with ${who}${callStatus ? ' — ' + callStatus : ''}`);
      if (event === 'reply' || missed) {
        const id = uid();
        writes.push({ coll: 'tasks', id, data: { id, title: event === 'reply' ? `Reply to ${who} (HighLevel)` : `Call back ${who} (missed call)`, notes: msgBody.slice(0, 500), due: ymd(), assignee: '', done: false, customerId: c?.id || '', link: c ? { kind: 'customer', id: c.id } : null, wf: 'HighLevel', createdAt: now() } });
      }
      if (c && ghlId && !c.ghlId) { c.ghlId = ghlId; writes.push({ coll: 'customers', id: c.id, data: c }); }
      await upsert(writes);
      return ok({ ok: true });
    }
    return ok({ error: 'unknown_event' }, 400);
  } catch (e) {
    console.error('webhook', (e as Error).message);
    return ok({ error: 'server' }, 500);
  }
});
