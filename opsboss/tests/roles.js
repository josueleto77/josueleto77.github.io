const { chromium } = require('playwright');
// Role behaviour in the app against a mocked Supabase backend: menus and route guard per role,
// subcontractor landing, server totals for roles without rate access, rates/commissions sent only by
// finance (to "comp" / settings "private"), and rows rejected by the server are reverted instead of retried.
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/roles.js`.
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
const settings = { company: 'Nexis Power', taxRate: 0, counters: {}, laborRate: 45, photoReqs: { solar: ['Front of house'] }, wfSeeded: true };
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
const navItems = p => p.$$eval('#nav a', a => a.map(x => x.getAttribute('href').slice(2)));
(async () => {
  const b = await chromium.launch();
  // subcontractor
  let { p, errs } = await session(b, 'sub');
  let nav = await navItems(p);
  assert(nav.length <= 7 && nav.includes('field') && !nav.includes('finance') && !nav.includes('customers'), `sub menu limited: ${nav.join(', ')}`);
  assert(/#\/field/.test(await p.evaluate(() => location.hash)), 'sub lands on field work orders');
  await p.evaluate(() => location.hash = '#/finance'); await p.waitForTimeout(250);
  assert(/isn’t available for your role/.test(await p.textContent('#view')), 'sub blocked from finance page');
  await p.evaluate(() => location.hash = '#/wo/j1'); await p.waitForTimeout(300);
  assert(/Solar 8 kW/.test(await p.textContent('#view')), 'sub opens their work order');
  assert(!errs.length, 'sub: no page errors ' + errs.join(' | ')); await p.close();
  // operations: sees money with server totals, never sends rates or commissions
  ({ p, errs } = await session(b, 'ops'));
  nav = await navItems(p); assert(nav.includes('finance') && !nav.includes('accounting') && !nav.includes('commissions'), 'ops menu: finance yes, accounting/commissions no');
  await p.evaluate(() => location.hash = '#/job/j1'); await p.waitForTimeout(300); await p.click('[data-act="tab"][data-v="financials"]'); await p.waitForTimeout(200);
  const fin = await p.$$eval('.card:first-child table tr', rs => Object.fromEntries(rs.map(r => { const t = r.querySelectorAll('td'); return [t[0].childNodes[0].textContent.trim(), t[1].querySelector('input') ? t[1].querySelector('input').value : t[1].textContent.trim()]; })));
  assert(fin['Actual cost'] === '$800.00' && fin['+ Pending commitments'] === '$500.00', `ops sees server totals: actual ${fin['Actual cost']}, commitments ${fin['+ Pending commitments']}`);
  assert(!/× \$80/.test(await p.textContent('#view')), 'ops does not see individual labor rates');
  await p.evaluate(() => location.hash = '#/wo/j1'); await p.waitForTimeout(300);
  await p.click('[data-act="woHours"]'); await p.waitForTimeout(150); await p.selectOption('[name=techId]', 't1'); await p.fill('[name=hours]', '2'); await p.click('[data-save]'); await p.waitForTimeout(1200);
  let ups = await p.evaluate(() => window.__ups);
  const jobUp = ups.filter(u => u.coll === 'jobs').pop();
  assert(jobUp && jobUp.data.fin.labor.length === 2 && jobUp.data.fin.labor.every(l => !('rate' in l)) && !('commissions' in jobUp.data.fin), 'ops: project saved without rates or commissions');
  assert(!ups.some(u => u.coll === 'comp' || (u.coll === 'settings' && u.id === 'private')), 'ops never writes rates/commissions or private settings');
  assert(!errs.length, 'ops: no page errors ' + errs.join(' | ')); await p.close();
  // sales: a change the server rejects is reverted, not retried forever
  ({ p, errs } = await session(b, 'sales', ['customers']));
  await p.evaluate(() => location.hash = '#/customer/c1'); await p.waitForTimeout(300);
  await p.click('[data-act="editCustomer"]'); await p.waitForTimeout(200); await p.fill('[name=name]', 'Hacked Name'); await p.click('[data-save]'); await p.waitForTimeout(1500);
  const toastTxt = await p.textContent('#toastRoot');
  assert(/can’t change customers/.test(toastTxt), 'sales: rejected change shows a clear message');
  assert(/Maria Lopez/.test(await p.textContent('#view')) && !/Hacked Name/.test(await p.textContent('#view')), 'sales: rejected change reverted to the server version');
  const n1 = (await p.evaluate(() => window.__ups)).length; await p.waitForTimeout(2500); await p.evaluate(() => location.hash = '#/mywork'); await p.waitForTimeout(1200);
  const n2 = (await p.evaluate(() => window.__ups)).filter(u => u.coll === 'customers').length;
  assert(n2 <= 2, `sales: no retry loop (${n2} customer upserts)`);
  nav = await navItems(p); assert(!nav.includes('purchasing') && !nav.includes('audit'), 'sales menu hides purchasing and audit');
  assert(!errs.length, 'sales: no page errors ' + errs.join(' | ')); await p.close();
  // finance: rates and commissions go to comp / private settings
  ({ p, errs } = await session(b, 'finance'));
  await p.evaluate(() => location.hash = '#/job/j1'); await p.waitForTimeout(300); await p.click('[data-act="tab"][data-v="financials"]'); await p.waitForTimeout(200);
  assert(/10h × \$80\.00/.test(await p.textContent('#view')), 'finance sees the individual labor rate');
  await p.evaluate(() => location.hash = '#/commissions'); await p.waitForTimeout(300);
  await p.click('[data-act="commPaid"]'); await p.waitForTimeout(400); const cf = await p.$('#cfYes'); if (cf) { await cf.click(); await p.waitForTimeout(300); }
  await p.waitForTimeout(1000);
  ups = await p.evaluate(() => window.__ups);
  const compUp = ups.filter(u => u.coll === 'comp').pop();
  assert(compUp && compUp.data.commissions[0].status === 'paid', 'finance: commission payment saved to comp');
  assert(ups.filter(u => u.coll === 'jobs').every(u => !('commissions' in (u.data.fin || {}))), 'finance: commissions never inside the project record');
  await p.evaluate(() => location.hash = '#/audit'); await p.waitForTimeout(400);
  assert(/Audit log/.test(await p.textContent('#view')), 'finance opens the audit log');
  assert(!errs.length, 'finance: no page errors ' + errs.join(' | ')); await p.close();
  console.log(process.exitCode ? 'ROLE CHECKS FAILED' : 'ROLE CHECKS PASSED');
  await b.close();
})();
