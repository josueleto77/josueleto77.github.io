// OpsBoss — asistente de IA (Claude) con aprobación humana.
// POST (sesión de OpsBoss; no disponible para subcontratistas):
//   { action: 'summarize', jobId }                       → resumen del expediente, riesgos, próximas acciones, datos faltantes
//   { action: 'extract', jobId, kind, mediaType, data }  → extrae datos de un documento (PDF o foto) para revisión
//   { action: 'draft', jobId, kind, lang?, instruction? } → borrador de mensaje al cliente (no se envía)
// La IA solo propone: nada se guarda ni se envía sin que una persona lo apruebe en OpsBoss.
// Datos mínimos: el servidor arma el contexto; nunca envía teléfono, correo, dirección, notas de acceso,
// firmas, fotos ni tarifas/comisiones individuales. Los montos solo van para roles con acceso a finanzas.
// Requiere: secreto ANTHROPIC_API_KEY y Settings → AI assistant activado por un admin.

import Anthropic from 'npm:@anthropic-ai/sdk@1.14.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-opus-5-5';
const H = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
type Rec = Record<string, any>;
const MONEY_ROLES = ['owner', 'admin', 'finance', 'ops', 'purchasing'];
const n = (v: unknown) => { const x = parseFloat(String(v ?? '')); return isFinite(x) ? x : 0; };
const sum = (a: Rec[] | undefined, f: (x: Rec) => number) => (a || []).reduce((s, x) => s + f(x), 0);
const round = (x: number) => Math.round(x * 100) / 100;

const SPEC_FIELDS: Record<string, string[][]> = {
  solar: [['utility', 'Utility'], ['usageKwh', 'Annual usage (kWh)'], ['dcKw', 'System size DC (kW)'], ['acKw', 'System size AC (kW)'], ['productionKwh', 'Est. production (kWh/yr)'], ['designRev', 'Design / revision'], ['modules', 'Modules (model × qty)'], ['inverters', 'Inverters'], ['batteries', 'Batteries'], ['icApp', 'Interconnection application #'], ['permitApp', 'Permit application #']],
  hvac: [['existingHeat', 'Existing heating system'], ['zones', 'Zones'], ['manualJ', 'Manual J/S'], ['indoorModel', 'Indoor model'], ['outdoorModel', 'Outdoor model'], ['ahri', 'AHRI #'], ['capacity', 'Capacity (BTU / tons)'], ['electricalScope', 'Electrical scope'], ['commissioning', 'Commissioning tests'], ['heatLoan', 'HEAT Loan #'], ['rebate', 'Rebate program / amount'], ['rebatePayee', 'Rebate beneficiary']],
  roofing: [['measureReport', 'Measurement report'], ['squares', 'Squares'], ['waste', 'Waste (%)'], ['manufacturer', 'Manufacturer'], ['roofSystem', 'Roof system'], ['ventilation', 'Ventilation'], ['flashing', 'Flashing'], ['disposal', 'Disposal'], ['decking', 'Decking (sheets replaced)'], ['extrasPrice', 'Extras unit price ($)']],
};
const EXTRA_FIELDS: Record<string, string[][]> = {
  equipment: [['equip.type', 'Equipment type'], ['equip.brand', 'Brand'], ['equip.model', 'Model'], ['equip.serial', 'Serial number']],
  permit: [['permit.type', 'Permit type'], ['permit.number', 'Permit #'], ['permit.jurisdiction', 'Jurisdiction / utility'], ['permit.status', 'Status'], ['permit.date', 'Date (YYYY-MM-DD)']],
  vendor_bill: [['bill.vendor', 'Vendor'], ['bill.number', 'Bill #'], ['bill.date', 'Date (YYYY-MM-DD)'], ['bill.total', 'Total ($)'], ['bill.category', 'Cost category']],
};

async function rows(coll: string, filter = '') {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_records?coll=eq.${coll}${filter}&select=data`, { headers: H });
  return r.ok ? (await r.json()).map((x: { data: Rec }) => x.data) : [];
}
async function memberRole(auth: string | null) {
  if (!auth?.startsWith('Bearer ')) return null;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/opsboss_claim`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok ? await r.json() : null;
}
function emailFromJwt(auth: string) {
  try { const p = JSON.parse(atob(auth.split(' ')[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return String(p.email || '').toLowerCase(); } catch { return ''; }
}
async function logRun(run: Rec) {
  await fetch(`${SB_URL}/rest/v1/opsboss_records`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify([{ coll: 'runs', id: run.id, data: run }]) }).catch(() => {});
}

// Contexto mínimo del proyecto, armado en el servidor según el rol.
async function projectContext(jobId: string, role: string) {
  const [job] = await rows('jobs', `&id=eq.${encodeURIComponent(jobId)}`);
  if (!job) return null;
  const [cust] = await rows('customers', `&id=eq.${encodeURIComponent(job.customerId || '')}`);
  const money = MONEY_ROLES.includes(role);
  const f = job.fin || {};
  const [permits, invoices, tasks, tickets, bills, pos] = await Promise.all([
    rows('permits', `&data->>jobId=eq.${encodeURIComponent(jobId)}`),
    money ? rows('invoices', `&data->>jobId=eq.${encodeURIComponent(jobId)}`) : Promise.resolve([]),
    rows('tasks', `&data->link->>id=eq.${encodeURIComponent(jobId)}`),
    rows('tickets', `&data->>customerId=eq.${encodeURIComponent(job.customerId || '')}`),
    money ? rows('bills') : Promise.resolve([]),
    money ? rows('pos', `&data->>projectId=eq.${encodeURIComponent(jobId)}`) : Promise.resolve([]),
  ]);
  const stage = job.ops?.stage || '';
  const openStageTasks = ((job.ops?.tasks || {})[stage] || []).filter((t: Rec) => !t.done).map((t: Rec) => t.t);
  const ctx: Rec = {
    today: new Date().toISOString().slice(0, 10),
    project: {
      number: job.number, title: job.title, service: job.division, job_status: job.status, operations_stage: stage, closed: !!job.ops?.closed,
      open_tasks_in_stage: openStageTasks,
      blockers: (job.blockers || []).filter((b: Rec) => !b.resolvedAt).map((b: Rec) => ({ reason: b.reason, owner: b.owner || '', follow_up: b.followUp || '' })),
      depends_on_other_projects: (job.dependsOn || []).length,
      next_action: job.nextAction || '', next_action_due: job.nextDue || '', scheduled_start: job.start || '', expected_install: job.expectedInstall || '', completed_at: job.completedAt || '',
      financing: { mode: job.financing?.mode || '', payer: job.financing?.payer || '', release_documents: job.financing?.release || '' },
      technical_specs: job.specs || {},
      scope_items: (job.items || []).map((i: Rec) => i.name),
      change_orders: (f.changeOrders || []).map((c: Rec) => ({ number: c.number, description: c.desc, status: c.status, ...(money ? { price: n(c.price) } : {}) })),
      installed_equipment: (job.installedEquip || []).map((e: Rec) => ({ type: e.type, brand: e.brand || '', model: e.model || '', serial_recorded: !!e.serial })),
      field_problems_open: (job.issues || []).filter((i: Rec) => !i.resolvedAt).map((i: Rec) => i.text),
      required_photos_taken: (job.reqPhotos || []).length,
      customer_signoff: !!job.signoff,
      recent_history: (job.history || []).slice(0, 25).map((h: Rec) => `${String(h.ts).slice(0, 10)} ${h.text}`),
    },
    customer: { first_name: String(cust?.name || '').split(/\s+/)[0] || 'the customer', city: cust?.city || '', language: cust?.lang || '', previous_service_tickets: tickets.map((t: Rec) => ({ number: t.number, title: t.title, status: t.status })) },
    permits: permits.map((p: Rec) => ({ type: p.type, status: p.status, submitted: p.submitted || '' })),
    open_tasks: tasks.filter((t: Rec) => !t.done).map((t: Rec) => ({ title: t.title, due: t.due })),
  };
  if (money) {
    const base = f.budget ? n(f.budget.price) : sum(job.items, (i) => n(i.qty) * n(i.price));
    const coPrice = sum((f.changeOrders || []).filter((c: Rec) => c.status === 'approved'), (c) => n(c.price));
    const billLines = bills.flatMap((b: Rec) => (b.lines || []).filter((l: Rec) => l.projectId === jobId));
    const actual = sum(billLines, (l) => n(l.amount)) + sum(f.costs, (c) => n(c.amount)) + n(f.laborCost) + n(f.commPaid);
    const committed = sum(pos.filter((p: Rec) => p.status === 'approved'), (p) => Math.max(0, n(p.amount) - sum(bills.flatMap((b: Rec) => b.lines || []).filter((l: Rec) => l.poId === p.id), (l) => n(l.amount)))) + n(f.commOpen);
    const revenue = base + coPrice, projected = actual + committed + n(f.remaining);
    ctx.finance = {
      approved_contract_value: round(revenue), actual_cost: round(actual), pending_commitments: round(committed), projected_cost: round(projected),
      projected_gross_profit: round(revenue - projected), projected_margin_pct: revenue ? round((revenue - projected) / revenue * 100) : 0,
      invoices: invoices.filter((i: Rec) => !['void', 'draft'].includes(i.status)).map((i: Rec) => ({ number: i.number, status: i.status, due: i.due, disputed: !!i.disputed, amount: round(sum(i.items, (x) => n(x.qty) * n(x.price))), paid: round(sum(i.payments, (p) => n(p.amount))) })),
    };
  }
  return { job, ctx };
}

const SYSTEM = (company: string) => `You are the operations assistant inside OpsBoss for ${company || 'Nexis Power'}, a solar, battery, HVAC/heat pump and roofing contractor in Massachusetts.
You prepare drafts for the team; a person reviews and decides. Rules:
- Use only the facts in the data you are given. If something is unknown or missing, say so plainly instead of guessing.
- Never commit to prices, scope changes, discounts, payments, dates or promises to the customer. When a next step involves any of these, mark it as needing approval.
- Keep it short and practical. Plain language, no filler.`;

const SUMMARY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['headline', 'summary', 'sales', 'operations', 'finance', 'risks', 'next_actions', 'missing_info'],
  properties: {
    headline: { type: 'string' }, summary: { type: 'string' }, sales: { type: 'string' }, operations: { type: 'string' }, finance: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['action', 'who', 'why', 'needs_approval'], properties: { action: { type: 'string' }, who: { type: 'string' }, why: { type: 'string' }, needs_approval: { type: 'boolean' } } } },
    missing_info: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['item', 'why'], properties: { item: { type: 'string' }, why: { type: 'string' } } } },
  },
};
const EXTRACT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['document_type', 'fields', 'notes'],
  properties: {
    document_type: { type: 'string' },
    fields: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'value', 'confidence', 'quote'], properties: { key: { type: 'string' }, value: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, quote: { type: 'string' } } } },
    notes: { type: 'string' },
  },
};
const DRAFT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['subject', 'sms', 'email', 'needs_approval', 'notes_for_staff'],
  properties: { subject: { type: 'string' }, sms: { type: 'string' }, email: { type: 'string' }, needs_approval: { type: 'array', items: { type: 'string' } }, notes_for_staff: { type: 'string' } },
};
const DRAFT_KINDS: Record<string, string> = {
  status_update: 'a friendly project status update: where the project is, what happens next, and what (if anything) we need from the customer',
  payment_reminder: 'a polite payment reminder for any open balance; do not threaten, do not offer discounts or new terms',
  schedule_confirmation: 'a confirmation of the next scheduled visit or installation, with what the customer should prepare',
  custom: 'the message described in the staff instruction',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = req.headers.get('Authorization');
  const role = await memberRole(auth);
  if (!role || role === 'sub') return json({ error: 'unauthorized' }, 401);
  if (!API_KEY) return json({ error: 'not_configured', message: 'Add the ANTHROPIC_API_KEY secret in Supabase → Edge Functions → Secrets.' }, 400);
  const [settings] = await rows('settings', '&id=eq.main');
  if (!settings?.aiEnabled) return json({ error: 'disabled', message: 'An admin must turn on the AI assistant in Settings.' }, 400);
  const email = emailFromJwt(auth!);
  // Límite simple de uso por persona: 40 solicitudes por hora.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await rows('runs', `&data->>by=eq.${encodeURIComponent(email)}&data->>system=eq.Claude&data->>ts=gte.${since}`);
  if (recent.length >= 40) return json({ error: 'rate_limited', message: 'AI limit reached for this hour. Try again later.' }, 429);

  let body: Rec = {};
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const { action, jobId } = body;
  if (!['summarize', 'extract', 'draft'].includes(action)) return json({ error: 'unknown_action' }, 400);
  const pc = jobId ? await projectContext(String(jobId), role) : null;
  if (!pc) return json({ error: 'not_found' }, 404);
  const { job, ctx } = pc;

  const client = new Anthropic({ apiKey: API_KEY });
  let schema: Rec, content: Anthropic.Beta.Messages.BetaContentBlockParam[], effort: 'low' | 'medium' | 'high' = 'medium';
  const data = `<project_data>\n${JSON.stringify(ctx, null, 1)}\n</project_data>`;
  if (action === 'summarize') {
    schema = SUMMARY_SCHEMA;
    content = [{ type: 'text', text: `${data}\n\nSummarize this project for the team. "sales", "operations" and "finance" are one or two sentences each about that status${ctx.finance ? '' : ' (finance figures are not available to this user — say only what the data shows)'}. List real risks only. Next actions: the 3-6 most useful, each with who should do it (a role, e.g. "Operations", "Finance", "Sales rep") and needs_approval=true when it touches price, scope, payment, dates or a customer commitment. Missing info: required data that is empty or absent for this service and stage (permits, specs, serial numbers, photos, financing documents, sign-off) and why it matters.` }];
  } else if (action === 'extract') {
    const kind = String(body.kind || 'specs');
    const mediaType = String(body.mediaType || '');
    const b64 = String(body.data || '');
    if (!b64 || b64.length > 9_000_000) return json({ error: 'file', message: 'Upload a PDF or photo up to about 6 MB.' }, 400);
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mediaType)) return json({ error: 'file', message: 'Only PDF, JPG, PNG, WEBP or GIF.' }, 400);
    const fields = [...(SPEC_FIELDS[job.division] || []), ...(EXTRA_FIELDS[kind] || [])];
    schema = EXTRACT_SCHEMA; effort = 'high';
    const doc: Anthropic.Beta.Messages.BetaContentBlockParam = mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: b64 } };
    content = [doc, { type: 'text', text: `This document belongs to project ${job.number} (${job.division}). Extract only values that appear in the document for these fields (key — label):\n${fields.map(([k, l]) => `${k} — ${l}`).join('\n')}\n\nFor each value found: use the exact key above, the value as written (numbers without units or thousands separators when the label asks for a number), your confidence, and a short quote from the document where you read it. Skip fields that are not in the document — never guess. In "notes", mention anything important that doesn't fit a field (e.g. expiry dates, conditions, mismatches with the project title).` }];
  } else {
    const kind = DRAFT_KINDS[body.kind] ? String(body.kind) : 'status_update';
    const lang = String(body.lang || ctx.customer.language || 'en');
    schema = DRAFT_SCHEMA;
    content = [{ type: 'text', text: `${data}\n\nWrite ${DRAFT_KINDS[kind]} to ${ctx.customer.first_name}, in ${lang === 'es' ? 'Spanish' : lang === 'pt' ? 'Portuguese' : 'English'}.${kind === 'custom' ? `\nStaff instruction: ${String(body.instruction || '').slice(0, 1000)}` : ''}\nGive a short SMS (under 320 characters, no links) and a slightly longer email (plain text, signed "${settings.company || 'Nexis Power'} team"). Do not state prices, dates, discounts or commitments that are not explicitly in the data; if the message would need one, leave a clear placeholder like [confirm date] and list it in needs_approval. notes_for_staff: anything the sender should check first.` }];
  }

  const started = new Date().toISOString();
  const run: Rec = { id: 'ai-' + crypto.randomUUID().slice(0, 12), kind: 'ai.' + action, system: 'Claude', ts: started, by: email, status: 'ok', attempts: 1 };
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      system: SYSTEM(settings.company),
      messages: [{ role: 'user', content }],
    });
    run.detail = `${action} · ${job.number} · ${response.usage.input_tokens} in / ${response.usage.output_tokens} out tokens · ${response.model}`;
    if (response.stop_reason === 'refusal') {
      run.status = 'warning'; run.detail += ' · declined'; await logRun(run);
      return json({ error: 'refused', message: 'The AI declined this request. Try rephrasing or do it manually.' }, 422);
    }
    if (response.stop_reason === 'max_tokens') {
      run.status = 'error'; run.detail += ' · output cut off'; await logRun(run);
      return json({ error: 'too_long', message: 'The answer was too long. Try a shorter document.' }, 422);
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.Beta.Messages.BetaTextBlock).text).join('');
    let result: Rec;
    try { result = JSON.parse(text); } catch { run.status = 'error'; run.detail += ' · unreadable answer'; await logRun(run); return json({ error: 'parse', message: 'The AI answer could not be read. Try again.' }, 502); }
    if (action === 'extract') {
      const allowed = new Map([...(SPEC_FIELDS[job.division] || []), ...(EXTRA_FIELDS[String(body.kind)] || [])].map(([k, l]) => [k, l]));
      result.fields = (result.fields || []).filter((x: Rec) => allowed.has(x.key)).map((x: Rec) => ({ ...x, label: allowed.get(x.key) }));
    }
    await logRun(run);
    return json({ ok: true, action, jobId, model: response.model, generatedAt: started, result });
  } catch (e) {
    run.status = 'error';
    if (e instanceof Anthropic.RateLimitError) run.detail = 'Claude rate limit';
    else if (e instanceof Anthropic.AuthenticationError) run.detail = 'Invalid ANTHROPIC_API_KEY';
    else if (e instanceof Anthropic.APIError) run.detail = `Claude API error ${e.status}`;
    else run.detail = (e as Error).message.slice(0, 300);
    await logRun(run);
    return json({ error: 'ai', message: run.detail }, 502);
  }
});
