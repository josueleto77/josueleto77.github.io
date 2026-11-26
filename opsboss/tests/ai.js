const { chromium } = require('playwright');
// AI assistant: the project sends only its id to the server function, results are shown as drafts, and nothing is
// saved, applied or sent until the user approves (tasks from ticked suggestions, reviewed document values, drafts).
// Mocked backend + mocked /functions/v1/opsboss-ai (no real API calls).
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/ai.js`.
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
const settings = { company: 'Nexis Power', taxRate: 0, counters: {}, laborRate: 45, photoReqs: { solar: ['Front of house'] }, wfSeeded: true, aiEnabled: true };
const baseRows = role => [
  { coll: 'settings', id: 'main', data: settings },
  { coll: 'techs', id: 't1', data: { id: 't1', name: 'Sub Crew', email: 'me@test.local', division: 'solar', color: '#111' } },
  { coll: 'customers', id: 'c1', data: { id: 'c1', name: 'Maria Lopez', phone: '555', email: '', address: '1 Main', city: 'Boston', zip: '02101', createdAt: '2026-01-01T00:00:00Z', equipment: [], property: {} } },
  { coll: 'jobs', id: 'j1', data: { id: 'j1', number: 'J-1', customerId: 'c1', division: 'solar', title: 'Solar 8 kW', techIds: ['t1'], status: 'scheduled', start: new Date(Date.now() + 864e5).toISOString(), duration: 8, items: [{ id: 'i', name: 'System', qty: 1, price: 20000, cost: 12000 }], checklist: [], photos: [], createdAt: '2026-11-01T00:00:00Z',
    fin: { changeOrders: [], costs: [], labor: [{ id: 'l1', techId: 't1', hours: 10, date: '2026-11-20' }], remaining: 0, remainingSet: true, laborCost: 800, commPaid: 0, commOpen: 500 } } },
  ...(['owner', 'admin', 'finance'].includes(role) ? [{ coll: 'comp', id: 'j1', data: { id: 'j1', labor: { l1: 80 }, commissions: [{ id: 'k1', rep: 'Ann', amount: 500, status: 'approved', ruleName: 'Std', ruleFrom: '2026-01-01' }] } }, { coll: 'settings', id: 'private', data: { commRules: [], techRates: { t1: 80 } } }] : []),
];
async function session(b, role, deny = []) {
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(({ role, rows, deny }) => {
    window.__ups = []; const store = rows.map(r => ({ ...r, data: JSON.parse(JSON.stringify(r.data)) }));
    const q = list => { const f = []; const o = { select: () => o, order: () => o, in: () => o, limit: () => o, eq: (k, v) => { f.push([k, v]); return o; },
      range: async () => ({ data: JSON.parse(JSON.stringify(list)), error: null }), maybeSingle: async () => { const r = list.find(x => f.every(([k, v]) => x[k] === v)); return { data: r ? JSON.parse(JSON.stringify(r)) : null }; }, then: (res, rej) => Promise.resolve({ data: list, error: null }).then(res, rej) }; return o; };
    const client = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'me@test.local' }, access_token: 't' } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) },
      rpc: async n => ({ data: n === 'opsboss_claim' ? role : n === 'opsboss_ghl_config' ? {} : n === 'opsboss_lock' ? true : null, error: null }),
      from: t => t !== 'opsboss_records' ? q([]) : ({ select: () => q(store),
        upsert: async arr => { window.__ups.push(...arr.map(r => JSON.parse(JSON.stringify(r)))); if (window.__denyOn && arr.some(r => deny.includes(r.coll))) return { error: { code: '42501', message: 'new row violates row-level security policy for table "opsboss_records"' } }; arr.forEach(r => { const i = store.findIndex(x => x.coll === r.coll && x.id === r.id); if (i >= 0) store[i] = r; else store.push(r); }); return { error: null }; },
        delete: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }) }),
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel() {},
      storage: { from: () => ({ upload: async () => ({ error: null }), createSignedUrls: async () => ({ data: [] }) }) },
    };
    Object.defineProperty(window, 'supabase', { configurable: true, get: () => ({ createClient: () => client }), set() {} });
  }, { role, rows: baseRows(role), deny });
  await p.goto('http://localhost:8765/opsboss/'); await p.waitForTimeout(1800);
  await p.evaluate(() => { window.__denyOn = true; window.__ups = []; });
  return { p, errs };
}
(async () => {
  const b = await chromium.launch();
  const { p, errs } = await session(b, 'ops');
  const sent = [];
  await p.route('**/functions/v1/opsboss-ai', async route => {
    const body = JSON.parse(route.request().postData()); sent.push(body);
    const result = body.action === 'summarize' ? { headline: 'Design approved, permits next', summary: 'Solar 8 kW for Maria; 10 h logged.', sales: 'Signed.', operations: 'Waiting on permit.', finance: 'Margin 40%.', risks: ['Permit not filed yet'], next_actions: [{ action: 'File building permit', who: 'Operations', why: 'Blocks install', needs_approval: false }, { action: 'Offer earlier install date', who: 'Sales rep', why: 'Customer asked', needs_approval: true }], missing_info: [{ item: 'Interconnection application #', why: 'Needed for PTO' }] }
      : body.action === 'extract' ? { document_type: 'Spec sheet', fields: [{ key: 'dcKw', value: '8.2', confidence: 'high', quote: 'System size 8.2 kW DC', label: 'System size DC (kW)' }, { key: 'inverters', value: 'IQ8+', confidence: 'medium', quote: 'Enphase IQ8+', label: 'Inverters' }], notes: '' }
      : { subject: 'Your solar project', sms: 'Hi Maria, your permit is being filed. Install date [confirm date].', email: 'Hi Maria,...', needs_approval: ['install date'], notes_for_staff: 'Confirm date first' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, action: body.action, jobId: body.jobId, model: 'claude-opus-5-5', generatedAt: new Date().toISOString(), result }) });
  });
  await p.evaluate(() => location.hash = '#/job/j1'); await p.waitForTimeout(400);
  await p.click('[data-act="aiOpen"]'); await p.waitForTimeout(200);
  assert(/Never sent|never sent/i.test(await p.textContent('.modal')) || /are never sent/.test(await p.textContent('.modal')), 'AI panel explains what is not sent');
  await p.click('#aiRun'); await p.waitForTimeout(600);
  assert(sent[0] && sent[0].action === 'summarize' && Object.keys(sent[0]).sort().join(',') === 'action,jobId', 'browser sends only the action and project id (server builds the context)');
  const m = await p.textContent('.modal');
  assert(/Design approved, permits next/.test(m) && /Needs approval/.test(m), 'summary shown with approval flags');
  let ups = await p.evaluate(() => window.__ups.filter(u => u.coll === 'tasks').length);
  assert(ups === 0, 'nothing saved before approval');
  await p.check('[data-ai-na="0"]'); await p.check('[data-ai-mi="0"]'); await p.click('#aiSave'); await p.waitForTimeout(1200);
  ups = await p.evaluate(() => window.__ups);
  const tasks = ups.filter(u => u.coll === 'tasks').map(u => u.data.title);
  assert(tasks.some(t => /File building permit/.test(t)) && tasks.some(t => /Interconnection application/.test(t)) && !tasks.some(t => /earlier install/.test(t)), 'only the ticked suggestions became tasks');
  const job = ups.filter(u => u.coll === 'jobs').pop();
  assert(job && job.data.ai.summary.savedBy && job.data.ai.summary.r.finance === '', 'summary saved with reviewer, finance text kept out of the shared record');
  // extract
  await p.click('[data-aitab="extract"]'); await p.waitForTimeout(100);
  await p.setInputFiles('#aiFile', { name: 'spec.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
  await p.click('#aiRun'); await p.waitForTimeout(600);
  assert(sent[1].action === 'extract' && sent[1].mediaType === 'application/pdf' && sent[1].data.length > 0, 'document sent for reading');
  assert(await p.isChecked('[data-ai-f="0"]') && !(await p.isChecked('[data-ai-f="1"]')), 'high-confidence values pre-ticked, medium left for review');
  await p.fill('[data-ai-fv="0"]', '8.4'); await p.click('#aiApply'); await p.waitForTimeout(1200);
  ups = await p.evaluate(() => window.__ups);
  const j2 = ups.filter(u => u.coll === 'jobs').pop().data;
  assert(j2.specs.dcKw === '8.4' && !j2.specs.inverters, 'only the reviewed (and edited) value was applied');
  // draft
  await p.click('[data-act="aiOpen"]'); await p.waitForTimeout(200); await p.click('[data-aitab="draft"]'); await p.click('#aiRun'); await p.waitForTimeout(600);
  assert(/Check before sending/.test(await p.textContent('.modal')), 'draft shows what must be checked before sending');
  await p.click('#aiTask'); await p.waitForTimeout(1000);
  ups = await p.evaluate(() => window.__ups);
  assert(ups.some(u => u.coll === 'tasks' && /AI draft, review first/.test(u.data.title)), 'draft saved as a task (not sent)');
  assert(!errs.length, 'no page errors ' + errs.join(' | '));
  await p.close();
  // settings: only owner/admin/finance can turn it on
  const s2 = await session(b, 'sales'); await s2.p.evaluate(() => location.hash = '#/settings'); await s2.p.waitForTimeout(500);
  assert(await s2.p.isDisabled('[data-act-input="aiToggle"]'), 'sales cannot change the AI setting');
  console.log(process.exitCode ? 'AI CHECKS FAILED' : 'AI CHECKS PASSED');
  await b.close();
})();
