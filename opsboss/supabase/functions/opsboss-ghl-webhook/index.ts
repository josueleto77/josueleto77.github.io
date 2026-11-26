// OpsBoss — recibe avisos de los workflows de HighLevel (acción "Webhook").
// URL: /functions/v1/opsboss-ghl-webhook?key=<clave>&event=lead|appointment|reply|call|consent[&src=<fuente>][&division=solar|roofing|hvac]
//   lead        → deduplica el contacto, identifica la fuente (web, Meta, formularios HVAC, calendario solar,
//                 Last English Form 2026 v2…) con el mapeo de Settings, crea el lead, asigna responsable,
//                 crea la primera tarea y avisa al equipo.
//   appointment → vincula la cita al lead, pasa el lead a "visita agendada", crea/ajusta la tarea de
//                 preparación y registra reprogramaciones y cancelaciones.
//   reply       → registra la respuesta y crea una tarea para contestar.
//   call        → registra la llamada (tarea si fue perdida).
//   consent     → registra baja / alta por canal (sms, email, call) e idioma.
// Cada aviso queda en el registro de ejecuciones (coll "runs"). Un aviso repetido (mismo contenido) no
// duplica registros: se responde "duplicate". Con &retry=<runId> se reprocesa un aviso que falló.
// La clave se valida contra opsboss_integrations (OpsBoss → Settings → HighLevel).

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const H = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
const ok = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);
const now = () => new Date().toISOString();
const ymd = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10);
const low = (s: unknown) => String(s ?? '').trim().toLowerCase();
const list = (s: unknown) => String(s ?? '').split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
type Rec = Record<string, any>;
type W = { coll: string; id: string; data: unknown };

async function rows(coll: string, filter = '') {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_records?coll=eq.${coll}${filter}&select=data`, { headers: H });
  return r.ok ? (await r.json()).map((x: { data: unknown }) => x.data) : [];
}
async function upsert(items: W[]) {
  if (!items.length) return;
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_records`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(items) });
  if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()));
}
const pick = (o: Rec, ...keys: string[]) => { for (const k of keys) { const v = k.split('.').reduce((a: any, x) => (a == null ? a : a[x]), o); if (v != null && v !== '' && typeof v !== 'object') return v; } return ''; };
async function sha(s: string) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

// Fuentes por defecto (se pueden editar en Settings → Lead sources).
const DEFAULT_SOURCES = [
  { key: 'web', label: 'Website', sources: 'website, web form, web, organic, nexispower.com', division: 'auto', pipeline: 'marketing' },
  { key: 'meta', label: 'Meta (Facebook / Instagram)', sources: 'facebook, instagram, meta, fb, ig, paid social', division: 'auto', pipeline: 'marketing' },
  { key: 'hvac_forms', label: 'HVAC forms', formNames: 'hvac, heat pump', division: 'hvac', pipeline: 'marketing' },
  { key: 'solar_cal', label: 'Solar calendar', calendarNames: 'solar', division: 'solar', pipeline: 'sales' },
  { key: 'lef2026v2', label: 'Last English Form 2026 (v2)', formNames: 'last english form 2026 (v2), last english form 2026 v2', division: 'auto', pipeline: 'marketing', lang: 'en' },
];

function guessDivision(text: string) {
  const t = text.toLowerCase();
  if (/roof|shingle|gutter|techo/.test(t)) return 'roofing';
  if (/hvac|heat pump|\bac\b|a\/c|furnace|mini.?split|cooling|heating/.test(t)) return 'hvac';
  return 'solar';
}

function matchSource(sources: Rec[], srcParam: string, info: Rec) {
  const act = sources.filter((s) => s.active !== false);
  if (srcParam) { const s = act.find((x) => low(x.key) === low(srcParam)); if (s) return { s, by: 'url' }; }
  for (const s of act) {
    if (info.formId && list(s.formIds).includes(low(info.formId))) return { s, by: 'form id' };
    if (info.calendarId && list(s.calendarIds).includes(low(info.calendarId))) return { s, by: 'calendar id' };
  }
  for (const s of act) {
    if (info.formName && list(s.formNames).some((n) => low(info.formName) === n || low(info.formName).includes(n))) return { s, by: 'form name' };
    if (info.calendarName && list(s.calendarNames).some((n) => low(info.calendarName).includes(n))) return { s, by: 'calendar name' };
  }
  for (const s of act) {
    if (info.tags.some((t: string) => list(s.tags).includes(low(t)))) return { s, by: 'tag' };
    if (info.source && list(s.sources).some((n) => low(info.source).includes(n))) return { s, by: 'source' };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok({ error: 'method' }, 405);
  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? '';
  const event = url.searchParams.get('event') ?? 'lead';
  const cfgR = await fetch(`${SB_URL}/rest/v1/opsboss_integrations?key=eq.ghl&select=value`, { headers: H });
  const [cfg] = cfgR.ok ? await cfgR.json() : [];
  if (!key || key !== cfg?.value?.webhookKey) return ok({ error: 'unauthorized' }, 401);

  const raw = await req.text();
  let b: Rec = {};
  try { b = JSON.parse(raw || '{}'); } catch { return ok({ error: 'bad_json' }, 400); }

  // Idempotencia: el mismo aviso (mismo evento + mismo contenido) solo se procesa una vez.
  const retry = url.searchParams.get('retry') ?? '';
  const runId = retry || 'wh-' + (await sha(event + '|' + raw)).slice(0, 24);
  const [prev] = await rows('runs', `&id=eq.${encodeURIComponent(runId)}`);
  if (prev && prev.status !== 'error') return ok({ ok: true, duplicate: true, runId });
  const run: Rec = { id: runId, kind: 'ghl.' + event, system: 'HighLevel', ts: now(), status: 'ok', detail: '', attempts: (prev?.attempts || 0) + 1, retry: { url: `?event=${event}${url.searchParams.get('src') ? '&src=' + url.searchParams.get('src') : ''}${url.searchParams.get('division') ? '&division=' + url.searchParams.get('division') : ''}`, payload: raw.slice(0, 12000) } };

  const ghlId = String(pick(b, 'contact_id', 'contactId', 'contact.id', 'id'));
  const first = String(pick(b, 'first_name', 'firstName', 'contact.firstName'));
  const last = String(pick(b, 'last_name', 'lastName', 'contact.lastName'));
  const name = String(pick(b, 'full_name', 'fullName', 'name', 'contact.name') || `${first} ${last}`.trim() || 'HighLevel contact');
  const phone = String(pick(b, 'phone', 'contact.phone'));
  const email = low(pick(b, 'email', 'contact.email'));
  const address = String(pick(b, 'address1', 'full_address', 'contact.address1'));
  const zip = String(pick(b, 'postal_code', 'postalCode', 'contact.postalCode'));
  const tags = Array.isArray(b.tags) ? b.tags.map(String) : String(b.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const msgBody = String(pick(b, 'message.body', 'message', 'body', 'customData.message'));
  const lang = low(pick(b, 'customData.language', 'language', 'contact.language', 'customData.idioma'));
  const info = {
    formId: String(pick(b, 'customData.formId', 'form.id', 'formId', 'form_id')),
    formName: String(pick(b, 'customData.formName', 'form.name', 'formName', 'form_name', 'workflow.name')),
    calendarId: String(pick(b, 'customData.calendarId', 'calendar.calendarId', 'calendarId', 'calendar.id')),
    calendarName: String(pick(b, 'customData.calendarName', 'calendar.calendarName', 'calendar.title', 'calendarName')),
    source: String(pick(b, 'customData.source', 'contact_source', 'source', 'contact.source', 'attributionSource.utmSource', 'attributionSource.sessionSource', 'attributionSource.medium', 'utm_source')),
    tags,
  };
  run.ids = { contact: ghlId, formId: info.formId, formName: info.formName, calendarId: info.calendarId, calendarName: info.calendarName, source: info.source };

  const writes: W[] = [];
  const activity = (text: string) => { const id = uid(); writes.push({ coll: 'activity', id, data: { id, text, ts: now(), by: 'HighLevel' } }); };
  const finish = async (body: Rec, status = 200) => { writes.push({ coll: 'runs', id: runId, data: run }); await upsert(writes); return ok({ ...body, runId }, status); };

  try {
    const [settings] = await rows('settings', '&id=eq.main');
    const sources: Rec[] = (settings?.leadSources?.length ? settings.leadSources : DEFAULT_SOURCES);
    const customers = await rows('customers');
    const addrKey = (a: string, z: string) => (a && z ? low(a).replace(/[^a-z0-9]/g, '') + '|' + digits(z).slice(0, 5) : '');
    let c = customers.find((x: Rec) => ghlId && x.ghlId === ghlId)
      || customers.find((x: Rec) => phone && digits(x.phone) && digits(x.phone) === digits(phone))
      || customers.find((x: Rec) => email && low(x.email) === email)
      || customers.find((x: Rec) => addrKey(address, zip) && addrKey(x.address, x.zip) === addrKey(address, zip));
    const touch = () => { if (c) writes.push({ coll: 'customers', id: c.id, data: c }); };
    const leads = await rows('leads');
    const openLead = (cid: string) => leads.filter((l: Rec) => l.customerId === cid && !['won', 'lost', 'notint'].includes(l.stage)).sort((a: Rec, b2: Rec) => String(b2.createdAt).localeCompare(String(a.createdAt)))[0];

    const ensureCustomer = (srcLabel: string) => {
      if (!c) {
        c = { id: uid(), name, phone, email, address, city: String(pick(b, 'city', 'contact.city')), zip, source: srcLabel || 'HighLevel', tags, createdAt: now(), notes: '', property: {}, equipment: [], ghlId, lang: lang || '', consent: { sms: true, email: true, call: true } };
        writes.push({ coll: 'customers', id: c.id, data: c });
        return true;
      }
      let ch = false;
      if (ghlId && !c.ghlId) { c.ghlId = ghlId; ch = true; }
      if (!c.phone && phone) { c.phone = phone; ch = true; }
      if (!c.email && email) { c.email = email; ch = true; }
      if (!c.address && address) { c.address = address; c.zip = c.zip || zip; ch = true; }
      if (lang && !c.lang) { c.lang = lang; ch = true; }
      if (ch) touch();
      return false;
    };

    const createLead = (m: { s: Rec; by: string } | null, stage?: string) => {
      const s = m?.s;
      const division = (s?.division && s.division !== 'auto') ? s.division
        : (['solar', 'roofing', 'hvac'].includes(url.searchParams.get('division') ?? '') ? url.searchParams.get('division')!
          : guessDivision([tags.join(' '), info.source, msgBody, info.formName, info.calendarName, String(pick(b, 'customData.service'))].join(' ')));
      const pipeline = s?.pipeline || 'marketing';
      const id = uid();
      const owner = s?.owner || settings?.leadOwnerDefault || '';
      const title = String(pick(b, 'customData.title', 'customData.service', 'opportunity_name') || `${division === 'roofing' ? 'Roofing' : division === 'hvac' ? 'HVAC' : 'Solar'} inquiry`);
      const lead = { id, customerId: c!.id, division, title, value: Number(pick(b, 'customData.value', 'lead_value')) || 0, stage: stage || (pipeline === 'sales' ? 'new' : 'warm'), stageAt: now(), source: s?.label || 'HighLevel', sourceKey: s?.key || 'unmapped', sourceMatch: m?.by || '', sourceIds: { formId: info.formId, formName: info.formName, calendarId: info.calendarId, utm: info.source }, owner, createdAt: now(), next: ymd(), notes: [info.source && `Source: ${info.source}`, info.formName && `Form: ${info.formName}`, msgBody].filter(Boolean).join('\n'), via: 'highlevel', lang: lang || s?.lang || '', history: [{ ts: now(), by: 'HighLevel', text: `Lead created from ${s?.label || 'an unmapped HighLevel source'}${m ? ' (matched by ' + m.by + ')' : ''}` }] };
      writes.push({ coll: 'leads', id, data: lead });
      leads.push(lead);
      // Primera tarea para el responsable.
      const tid = uid();
      writes.push({ coll: 'tasks', id: tid, data: { id: tid, title: `First contact: call ${c!.name}`, notes: [c!.phone, c!.email, lead.title].filter(Boolean).join(' · '), due: ymd(), assignee: owner, done: false, customerId: c!.id, link: { kind: 'lead', id }, wf: 'New lead', createdAt: now(), dedupe: 'first-contact:' + id } });
      // Aviso al equipo.
      const aid = uid();
      writes.push({ coll: 'alerts', id: aid, data: { id: aid, kind: 'lead.new', sev: 'info', ts: now(), title: `New lead: ${c!.name}`, text: [c!.phone, c!.email, [c!.address, c!.city].filter(Boolean).join(', '), `${division.toUpperCase()} · ${s?.label || 'Unmapped source'}`].filter(Boolean).join(' · '), link: { kind: 'lead', id }, readBy: [] } });
      return lead;
    };

    if (event === 'lead') {
      const m = matchSource(sources, url.searchParams.get('src') ?? '', info);
      run.source = m?.s?.key || 'unmapped';
      ensureCustomer(m?.s?.label || '');
      const recent = openLead(c!.id);
      if (recent && Date.now() - new Date(recent.createdAt).getTime() < 30 * 864e5) {
        recent.history = [{ ts: now(), by: 'HighLevel', text: `Came in again via ${m?.s?.label || 'HighLevel'} (duplicate lead merged)` }, ...(recent.history || [])].slice(0, 100);
        recent.dupCount = (recent.dupCount || 0) + 1;
        writes.push({ coll: 'leads', id: recent.id, data: recent });
        activity(`HighLevel: ${c!.name} came in again (lead already open)`);
        run.status = 'duplicate'; run.detail = `Contact already has an open lead (${recent.title}); no new lead created.`;
        return await finish({ ok: true, duplicate: true, leadId: recent.id });
      }
      const lead = createLead(m);
      activity(`📥 New lead from ${lead.source}: ${c!.name}`);
      run.detail = `Lead created for ${c!.name} · source ${lead.source}${m ? ' (by ' + m.by + ')' : ' — UNMAPPED'}`;
      if (!m) run.status = 'warning';
      return await finish({ ok: true, leadId: lead.id, customerId: c!.id, source: run.source });
    }

    if (event === 'appointment') {
      const apptGhl = String(pick(b, 'customData.appointmentId', 'calendar.appointmentId', 'appointment.id', 'appointmentId'));
      const start = String(pick(b, 'customData.startTime', 'calendar.startTime', 'appointment.startTime', 'startTime'));
      const end = String(pick(b, 'customData.endTime', 'calendar.endTime', 'appointment.endTime', 'endTime'));
      const rawSt = low(pick(b, 'customData.status', 'calendar.appoinmentStatus', 'calendar.appointmentStatus', 'calendar.status', 'appointment.appointmentStatus', 'appointmentStatus', 'status'));
      const status = /cancel/.test(rawSt) ? 'cancelled' : /no.?show/.test(rawSt) ? 'noshow' : /showed|complete/.test(rawSt) ? 'done' : 'booked';
      const m = matchSource(sources, url.searchParams.get('src') ?? '', info);
      ensureCustomer(m?.s?.label || '');
      const appts = await rows('appts');
      let a = appts.find((x: Rec) => apptGhl && x.ghlId === apptGhl)
        || appts.find((x: Rec) => !apptGhl && x.customerId === c!.id && x.calendarId === info.calendarId && x.status === 'booked');
      let lead = openLead(c!.id);
      if (!lead) lead = createLead(m, (m?.s?.pipeline || 'sales') === 'sales' ? 'visit' : 'mappt');
      const isNew = !a;
      if (!a) a = { id: uid(), ghlId: apptGhl, customerId: c!.id, leadId: lead.id, calendarId: info.calendarId, calendarName: info.calendarName, title: String(pick(b, 'customData.title', 'calendar.title') || `${info.calendarName || 'Appointment'} — ${c!.name}`), start, end, status, sourceKey: m?.s?.key || '', assignedTo: String(pick(b, 'customData.assignedTo', 'calendar.assignedTo', 'assignedUser')), history: [], createdAt: now() };
      const hist = (text: string) => { a!.history = [{ ts: now(), by: 'HighLevel', text }, ...(a!.history || [])].slice(0, 50); };
      if (isNew) hist(`Booked for ${start}`);
      else if (start && a.start && new Date(start).getTime() !== new Date(a.start).getTime()) { hist(`Rescheduled from ${a.start} to ${start}`); a.reschedules = (a.reschedules || 0) + 1; a.start = start; a.end = end || a.end; }
      if (a.status !== status) { if (!isNew) hist(`Status ${a.status} → ${status}`); a.status = status; }
      // Lead → visita agendada.
      if (status === 'booked' && !['visit', 'mappt', 'proposal', 'negotiation', 'won'].includes(lead.stage)) {
        const to = ['warm', 'mcontacted', 'notint'].includes(lead.stage) ? 'mappt' : 'visit';
        lead.history = [{ ts: now(), by: 'HighLevel', text: `Stage ${lead.stage} → ${to} (appointment booked)` }, ...(lead.history || [])];
        lead.stage = to; lead.stageAt = now();
      }
      lead.apptId = a.id; lead.next = start ? ymd(new Date(start)) : lead.next;
      writes.push({ coll: 'leads', id: lead.id, data: lead });
      // Tarea de preparación (un día antes), se mueve con la cita y se cierra si se cancela.
      const tasks = a.prepTaskId ? await rows('tasks', `&id=eq.${a.prepTaskId}`) : [];
      let t = tasks[0];
      const due = start ? ymd(new Date(new Date(start).getTime() - 864e5)) : ymd();
      if (!t && status === 'booked') { t = { id: uid(), title: `Prepare for visit: ${c!.name}`, notes: `${a.title} · ${start}`, due, assignee: lead.owner || '', done: false, customerId: c!.id, link: { kind: 'lead', id: lead.id }, wf: 'Appointment', createdAt: now() }; a.prepTaskId = t.id; }
      else if (t) { if (status === 'cancelled') { t.done = true; t.doneAt = now(); t.notes = (t.notes || '') + ' · appointment cancelled'; } else { t.due = due; t.notes = `${a.title} · ${start}`; if (status === 'booked') t.done = false; } }
      if (t) writes.push({ coll: 'tasks', id: t.id, data: t });
      writes.push({ coll: 'appts', id: a.id, data: a });
      activity(isNew ? `📅 Appointment booked: ${c!.name} — ${start}` : `📅 Appointment updated: ${c!.name} — ${a.history[0]?.text || status}`);
      run.detail = `${isNew ? 'Booked' : 'Updated'} appointment for ${c!.name} (${status})`;
      return await finish({ ok: true, apptId: a.id, leadId: lead.id });
    }

    if (event === 'consent') {
      if (!c) { run.status = 'warning'; run.detail = 'Contact not found in OpsBoss'; return await finish({ ok: true, found: false }); }
      const ch = low(url.searchParams.get('channel') || pick(b, 'customData.channel') || 'all');
      const v = !/^(off|false|0|no|stop|unsubscribe|dnd)$/.test(low(url.searchParams.get('value') || pick(b, 'customData.value') || 'off'));
      c.consent = c.consent || { sms: true, email: true, call: true };
      (ch === 'all' ? ['sms', 'email', 'call'] : [ch]).forEach((k) => { c!.consent[k] = v; });
      c.consentLog = [{ ts: now(), by: 'HighLevel', text: `${ch.toUpperCase()} ${v ? 'opt-in' : 'opt-out'}` }, ...(c.consentLog || [])].slice(0, 50);
      if (lang) c.lang = lang;
      touch(); activity(`🔕 ${c.name}: ${ch} ${v ? 'opt-in' : 'opt-out'} (HighLevel)`);
      run.detail = `${c.name}: ${ch} ${v ? 'opt-in' : 'opt-out'}`;
      return await finish({ ok: true });
    }

    if (event === 'reply' || event === 'call') {
      const who = c?.name || name || phone;
      const callStatus = low(pick(b, 'call.status', 'customData.callStatus', 'status'));
      const missed = event === 'call' && /miss|no.?answer|voicemail|busy|fail/.test(callStatus);
      if (event === 'reply' && c && /^\s*(stop|unsubscribe|cancel|end|quit)\s*$/i.test(msgBody)) { c.consent = { ...(c.consent || {}), sms: false }; c.consentLog = [{ ts: now(), by: 'HighLevel', text: 'SMS opt-out (STOP)' }, ...(c.consentLog || [])]; touch(); }
      activity(event === 'reply' ? `💬 ${who} replied: ${msgBody.slice(0, 200)}` : `📞 Call with ${who}${callStatus ? ' — ' + callStatus : ''}`);
      if (event === 'reply' || missed) {
        const id = uid();
        writes.push({ coll: 'tasks', id, data: { id, title: event === 'reply' ? `Reply to ${who} (HighLevel)` : `Call back ${who} (missed call)`, notes: msgBody.slice(0, 500), due: ymd(), assignee: '', done: false, customerId: c?.id || '', link: c ? { kind: 'customer', id: c.id } : null, wf: 'HighLevel', createdAt: now() } });
      }
      if (c && ghlId && !c.ghlId) { c.ghlId = ghlId; touch(); }
      run.detail = `${event} from ${who}`;
      return await finish({ ok: true });
    }
    run.status = 'error'; run.detail = 'Unknown event ' + event;
    return await finish({ error: 'unknown_event' }, 400);
  } catch (e) {
    console.error('webhook', (e as Error).message);
    try { await upsert([{ coll: 'runs', id: runId, data: { ...run, status: 'error', detail: String((e as Error).message).slice(0, 500) } }]); } catch { /* sin registro */ }
    return ok({ error: 'server', runId }, 500);
  }
});
