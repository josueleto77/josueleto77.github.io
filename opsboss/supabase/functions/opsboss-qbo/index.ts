// OpsBoss — conexión de solo lectura con QuickBooks Online (libro contable oficial).
// POST (sesión de OpsBoss, roles owner/admin/finance):
//   { action: 'status' }      → configuración y estado de la conexión
//   { action: 'connect' }     → URL de autorización de Intuit (OAuth 2.0)
//   { action: 'pull', since?, full? } → importa facturas, pagos, notas de crédito, recibos, reembolsos,
//                                facturas de proveedor, pagos a proveedores, créditos de proveedor, gastos
//                                y depósitos al libro de OpsBoss (coll "ledger"). Repetir la importación
//                                actualiza los mismos registros (ID estable "qbo-<tipo>-<Id>"), no duplica.
//   { action: 'disconnect' }  → revoca y borra los tokens
// GET ?code=…&state=…&realmId=…  → retorno de Intuit; guarda los tokens y vuelve a OpsBoss.
// Secretos (Supabase → Edge Functions → Secrets): QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_ENV (sandbox|production),
// APP_URL (opcional, por defecto https://josueleto77.github.io/opsboss/). Los tokens viven en opsboss_integrations
// (solo el service role los lee). No escribe nada en QuickBooks: la escritura queda para una fase posterior.

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const CID = Deno.env.get('QBO_CLIENT_ID') ?? '';
const CSECRET = Deno.env.get('QBO_CLIENT_SECRET') ?? '';
const ENV = (Deno.env.get('QBO_ENV') ?? 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://josueleto77.github.io/opsboss/';
const API = ENV === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';
const REDIRECT = `${SB_URL}/functions/v1/opsboss-qbo`;
const H = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
type Rec = Record<string, any>;

async function getCfg(): Promise<Rec> {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_integrations?key=eq.qbo&select=value`, { headers: H });
  const [row] = r.ok ? await r.json() : [];
  return row?.value ?? {};
}
async function setCfg(v: Rec) {
  const r = await fetch(`${SB_URL}/rest/v1/opsboss_integrations`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify([{ key: 'qbo', value: v, updated_at: new Date().toISOString() }]) });
  if (!r.ok) throw new Error('db ' + r.status);
}
async function memberRole(auth: string | null) {
  if (!auth?.startsWith('Bearer ')) return null;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/opsboss_claim`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok ? await r.json() : null;
}
async function token(body: Record<string, string>) {
  const r = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(`${CID}:${CSECRET}`), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Intuit token: ' + (d.error_description || d.error || r.status));
  return d;
}
async function access(cfg: Rec) {
  if (cfg.access && Date.now() < (cfg.accessExp || 0) - 60_000) return cfg.access;
  if (!cfg.refresh) throw new Error('not_connected');
  const t = await token({ grant_type: 'refresh_token', refresh_token: cfg.refresh });
  cfg.access = t.access_token; cfg.accessExp = Date.now() + t.expires_in * 1000;
  cfg.refresh = t.refresh_token || cfg.refresh; cfg.refreshExp = Date.now() + (t.x_refresh_token_expires_in || 0) * 1000;
  await setCfg(cfg);
  return cfg.access;
}
async function qb(cfg: Rec, path: string) {
  const r = await fetch(`${API}/v3/company/${cfg.realmId}${path}${path.includes('?') ? '&' : '?'}minorversion=75`, { headers: { Authorization: `Bearer ${await access(cfg)}`, Accept: 'application/json' } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('QuickBooks ' + r.status + ': ' + (d?.Fault?.Error?.[0]?.Detail || d?.Fault?.Error?.[0]?.Message || ''));
  return d;
}

const ref = (x: Rec | undefined) => x?.name ?? '';
const lineOf = (l: Rec) => {
  const d = l.AccountBasedExpenseLineDetail || l.ItemBasedExpenseLineDetail || l.SalesItemLineDetail || l.DepositLineDetail || {};
  return { desc: l.Description || '', amount: Number(l.Amount) || 0, account: ref(d.AccountRef) || ref(d.ItemRef), klass: ref(d.ClassRef), customer: ref(d.CustomerRef) || ref(d.Entity) };
};
const linked = (x: Rec) => (x.Line || []).flatMap((l: Rec) => (l.LinkedTxn || []).map((t: Rec) => ({ type: String(t.TxnType || '').toLowerCase(), qbId: t.TxnId, amount: Number(l.Amount) || 0 })));
const ENTITIES: [string, string, (x: Rec) => Rec][] = [
  ['Invoice', 'invoice', (x) => ({ name: ref(x.CustomerRef), amount: x.TotalAmt, balance: x.Balance, due: x.DueDate, tax: x.TxnTaxDetail?.TotalTax || 0, memo: x.PrivateNote || x.CustomerMemo?.value || '', klass: ref(x.ClassRef) })],
  ['Payment', 'payment', (x) => ({ name: ref(x.CustomerRef), amount: x.TotalAmt, unapplied: x.UnappliedAmt || 0, applied: linked(x), method: ref(x.PaymentMethodRef), ref: x.PaymentRefNum || '', memo: x.PrivateNote || '' })],
  ['CreditMemo', 'credit', (x) => ({ name: ref(x.CustomerRef), amount: x.TotalAmt, balance: x.RemainingCredit || 0, memo: x.PrivateNote || '' })],
  ['SalesReceipt', 'salesreceipt', (x) => ({ name: ref(x.CustomerRef), amount: x.TotalAmt, tax: x.TxnTaxDetail?.TotalTax || 0, memo: x.PrivateNote || '' })],
  ['RefundReceipt', 'refund', (x) => ({ name: ref(x.CustomerRef), amount: x.TotalAmt, memo: x.PrivateNote || '' })],
  ['Bill', 'bill', (x) => ({ name: ref(x.VendorRef), amount: x.TotalAmt, balance: x.Balance, due: x.DueDate, memo: x.PrivateNote || '', attachments: 0 })],
  ['BillPayment', 'billpayment', (x) => ({ name: ref(x.VendorRef), amount: x.TotalAmt, applied: linked(x), memo: x.PrivateNote || '' })],
  ['VendorCredit', 'vendorcredit', (x) => ({ name: ref(x.VendorRef), amount: x.TotalAmt, balance: x.Balance || 0, memo: x.PrivateNote || '' })],
  ['Purchase', 'expense', (x) => ({ name: ref(x.EntityRef), amount: x.TotalAmt, account: ref(x.AccountRef), method: x.PaymentType || '', memo: x.PrivateNote || '', credit: !!x.Credit })],
  ['Deposit', 'deposit', (x) => ({ name: '', amount: x.TotalAmt, account: ref(x.DepositToAccountRef), memo: x.PrivateNote || '' })],
];

async function pull(cfg: Rec, since: string) {
  const exist = new Map<string, Rec>();
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SB_URL}/rest/v1/opsboss_records?coll=eq.ledger&select=id,data&order=id&offset=${from}&limit=1000`, { headers: H });
    const part = r.ok ? await r.json() : [];
    part.forEach((x: Rec) => exist.set(x.id, x.data));
    if (part.length < 1000) break;
  }
  const out: Rec[] = []; const counts: Record<string, number> = {}; let created = 0, updated = 0, same = 0;
  const batch = new Date().toISOString();
  for (const [ent, type, map] of ENTITIES) {
    for (let start = 1; ; start += 1000) {
      const q = `select * from ${ent} where Metadata.LastUpdatedTime >= '${since}' STARTPOSITION ${start} MAXRESULTS 1000`;
      const d = await qb(cfg, `/query?query=${encodeURIComponent(q)}`);
      const items: Rec[] = d.QueryResponse?.[ent] ?? [];
      for (const x of items) {
        const id = `qbo-${type}-${x.Id}`, old = exist.get(id);
        const rec: Rec = { id, src: 'qbo', type, qbId: x.Id, num: x.DocNumber || '', date: x.TxnDate, lines: (x.Line || []).filter((l: Rec) => l.DetailType !== 'SubTotalLineDetail').map(lineOf), updatedAt: x.MetaData?.LastUpdatedTime, syncToken: x.SyncToken, ...map(x) };
        rec.amount = Number(rec.amount) || 0; rec.balance = rec.balance == null ? undefined : Number(rec.balance) || 0;
        // Conserva lo que se asignó en OpsBoss (proyecto, cliente, notas).
        if (old) { for (const k of ['projectId', 'customerId', 'note', 'assignedBy', 'splits']) if (old[k] !== undefined) rec[k] = old[k]; }
        rec.batch = old && old.updatedAt === rec.updatedAt ? old.batch : batch;
        if (!old) created++; else if (old.updatedAt === rec.updatedAt) { same++; continue; } else updated++;
        out.push({ coll: 'ledger', id, data: rec });
        counts[type] = (counts[type] || 0) + 1;
      }
      if (items.length < 1000) break;
    }
  }
  for (let i = 0; i < out.length; i += 500) {
    const r = await fetch(`${SB_URL}/rest/v1/opsboss_records`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(out.slice(i, i + 500)) });
    if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()));
  }
  return { created, updated, unchanged: same, counts };
}

async function logRun(run: Rec) {
  await fetch(`${SB_URL}/rest/v1/opsboss_records`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify([{ coll: 'runs', id: run.id, data: run }]) }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);

  // Retorno de Intuit.
  if (req.method === 'GET') {
    const back = (q: string) => Response.redirect(`${APP_URL}#/accounting?qbo=${q}`, 302);
    try {
      const cfg = await getCfg();
      if (!url.searchParams.get('code') || !cfg.state || url.searchParams.get('state') !== cfg.state || Date.now() > (cfg.stateExp || 0)) return back('bad_state');
      const t = await token({ grant_type: 'authorization_code', code: url.searchParams.get('code')!, redirect_uri: REDIRECT });
      const v: Rec = { realmId: url.searchParams.get('realmId'), access: t.access_token, accessExp: Date.now() + t.expires_in * 1000, refresh: t.refresh_token, refreshExp: Date.now() + (t.x_refresh_token_expires_in || 0) * 1000, env: ENV, connectedAt: new Date().toISOString(), lastSync: cfg.lastSync || null };
      try { const ci = await qb(v, `/companyinfo/${v.realmId}`); v.companyName = ci.CompanyInfo?.CompanyName || ''; } catch { /* nombre opcional */ }
      await setCfg(v);
      return back('connected');
    } catch (e) { console.error('qbo cb', (e as Error).message); return back('error'); }
  }

  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const role = await memberRole(req.headers.get('Authorization'));
    if (!role) return json({ error: 'unauthorized' }, 401);
    const { action, ...p } = await req.json().catch(() => ({}));
    const cfg = await getCfg();
    if (action === 'status') return json({ configured: !!(CID && CSECRET), env: ENV, connected: !!cfg.refresh, companyName: cfg.companyName || '', realmId: cfg.realmId || '', lastSync: cfg.lastSync || null, connectedAt: cfg.connectedAt || null, refreshExpires: cfg.refreshExp || null, redirectUri: REDIRECT, lastResult: cfg.lastResult || null });
    if (!['owner', 'admin', 'finance'].includes(role)) return json({ error: 'forbidden' }, 403);
    if (!CID || !CSECRET) return json({ error: 'not_configured', message: 'Add QBO_CLIENT_ID and QBO_CLIENT_SECRET to the Supabase Edge Function secrets.' }, 400);

    if (action === 'connect') {
      const state = crypto.randomUUID();
      await setCfg({ ...cfg, state, stateExp: Date.now() + 15 * 60_000 });
      const q = new URLSearchParams({ client_id: CID, response_type: 'code', scope: 'com.intuit.quickbooks.accounting', redirect_uri: REDIRECT, state });
      return json({ url: `https://appcenter.intuit.com/connect/oauth2?${q}` });
    }
    if (action === 'disconnect') {
      if (cfg.refresh) await fetch('https://developer.api.intuit.com/v2/oauth2/tokens/revoke', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(`${CID}:${CSECRET}`), 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ token: cfg.refresh }) }).catch(() => {});
      await setCfg({ lastSync: cfg.lastSync || null });
      return json({ ok: true });
    }
    if (action === 'pull') {
      if (!cfg.refresh) return json({ error: 'not_connected' }, 400);
      const since = p.full ? new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 19) + 'Z' : (p.since || cfg.lastSync || new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 19) + 'Z');
      const started = new Date().toISOString();
      const run: Rec = { id: 'qbo-' + started.replace(/\D/g, '').slice(0, 14), kind: 'qbo.pull', system: 'QuickBooks', ts: started, status: 'ok', attempts: 1, retry: { action: 'pull', since } };
      try {
        const r = await pull(cfg, since);
        const fresh = await getCfg();
        await setCfg({ ...fresh, lastSync: started, lastResult: r });
        run.detail = `Imported from QuickBooks since ${since}: ${r.created} new, ${r.updated} updated, ${r.unchanged} unchanged`;
        await logRun(run);
        return json({ ok: true, since, ...r });
      } catch (e) {
        run.status = 'error'; run.detail = (e as Error).message.slice(0, 500); await logRun(run);
        throw e;
      }
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('qbo', (e as Error).message);
    return json({ error: 'qbo', message: (e as Error).message }, 502);
  }
});
