const { chromium } = require('playwright');
// Team dashboards: each board renders, figures drill down to their records, filters (period, service,
// owner, source) change the numbers, and the delayed-materials / held-money rules work.
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/dashboards.js`.
const path = require('path'), os = require('os');
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/opsboss/?demo'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  // a signed project this month with a late PO and a loan balance
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('opsboss.v1')); const c = d.customers[0];
    const j = { id: 'db1', number: 'J-8801', customerId: c.id, division: 'solar', title: 'Dashboard test', techIds: [d.techs[0].id], start: new Date(Date.now() + 3 * 864e5).toISOString(), duration: 8, status: 'scheduled', items: [{ id: 'x', name: 'System', qty: 1, price: 30000, cost: 20000 }], checklist: [], photos: [], financing: { mode: 'loan', payer: 'GoodLeap', release: 'PTO letter' }, createdAt: new Date().toISOString() };
    d.jobs.unshift(j);
    d.pos = [{ id: 'po1', number: 'PO-1001', projectId: 'db1', vendor: 'CED', category: 'Equipment', amount: 9000, status: 'approved', expected: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), date: new Date().toISOString().slice(0, 10) }];
    d.invoices.unshift({ id: 'dbi', number: 'INV-8801', customerId: c.id, jobId: 'db1', division: 'solar', items: [{ id: 'y', name: 'Milestone 1', qty: 1, price: 10000, cost: 0 }], status: 'sent', createdAt: new Date().toISOString(), due: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), payments: [] });
    localStorage.setItem('opsboss.v1', JSON.stringify(d));
  });
  await p.reload(); await p.waitForTimeout(1500);
  const go = async h => { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(300); };
  const tab = async t => { await p.click(`[data-act="tab"][data-t="board"][data-v="${t}"]`); await p.waitForTimeout(250); };
  const tileVal = l => p.$$eval('.kpi', (els, l) => { const e = els.find(x => x.querySelector('.l').textContent.trim() === l); return e ? e.querySelector('.v').textContent.trim() : null; }, l);
  const drill = async l => { await p.click(`.kpi:has(.l:text-is("${l}"))`); await p.waitForTimeout(200); const t = await p.textContent('.modal'); await p.keyboard.press('Escape'); await p.waitForTimeout(100); return t; };
  await go('#/boards');
  assert(/Team dashboards/.test(await p.textContent('#view')), 'dashboards page opens on the Direction board for the owner');
  const signed = await tileVal('Signed sales');
  assert(signed && signed !== '$0', `direction: signed sales ${signed}`);
  assert(/J-8801/.test(await drill('Signed sales')), 'signed sales drills down to the project');
  assert(/INV-8801|J-8801/.test(await drill('Money held up')), 'money held up includes the financier balance');
  await p.screenshot({ path: path.join(os.tmpdir(), 'db-direction.png'), fullPage: true });
  // service filter
  await p.selectOption('[data-act-input="boardDiv"]', 'hvac'); await p.waitForTimeout(300);
  assert(!/J-8801/.test(await drill('Signed sales')), 'service filter (HVAC) removes the solar project');
  await p.selectOption('[data-act-input="boardDiv"]', 'all'); await p.waitForTimeout(250);
  // owner filter
  const owner = await p.$eval('[data-f="bOwner"] option:nth-child(2)', o => o.value);
  await p.selectOption('[data-f="bOwner"]', owner); await p.waitForTimeout(250);
  assert(/Reset filters/.test(await p.textContent('#view')), `owner filter applied (${owner})`);
  await p.click('[data-act="boardReset"]'); await p.waitForTimeout(250);
  // period: last month excludes the project signed today
  await p.selectOption('[data-f="bp"]', 'lastmonth'); await p.waitForTimeout(250);
  assert(!/J-8801/.test(await drill('Signed sales')), 'period filter (last month) excludes a project signed today');
  await p.selectOption('[data-f="bp"]', 'ytd'); await p.waitForTimeout(250);
  // sales
  await tab('sales');
  for (const l of ['Leads not contacted', 'Appointments', 'Proposals without follow-up', 'Close rate', 'Open pipeline']) assert((await tileVal(l)) !== null, `sales: ${l} = ${await tileVal(l)}`);
  assert(/Results by lead source/.test(await p.textContent('#view')), 'sales: profitability by lead source');
  await p.screenshot({ path: path.join(os.tmpdir(), 'db-sales.png'), fullPage: true });
  // operations
  await tab('ops');
  assert(/PO-1001/.test(await drill('Delayed materials')), 'operations: late PO shows as delayed material');
  assert(/J-8801/.test(await drill('Installs · next 14 days')), 'operations: upcoming install listed');
  assert((await tileVal('Crew utilization · next 2 weeks')) !== null, 'operations: crew utilization');
  // mark received → no longer delayed
  await go('#/purchasing'); await p.click('[data-act="poRecv"]'); await p.waitForTimeout(200);
  await go('#/boards'); await tab('ops');
  assert((await tileVal('Delayed materials')) === '0', 'receiving the PO clears the delay');
  await p.screenshot({ path: path.join(os.tmpdir(), 'db-ops.png'), fullPage: true });
  // finance
  await tab('finance');
  assert(/INV-8801/.test(await drill('To collect this week')), 'finance: invoice due this week to collect');
  for (const l of ['To pay this week', 'Completed, not invoiced', 'Costs without project', 'Differences with QuickBooks']) assert((await tileVal(l)) !== null, `finance: ${l} = ${await tileVal(l)}`);
  // service
  await tab('service');
  for (const l of ['Open tickets', 'Active warranties', 'Avg. resolution time', 'Repeated problems']) assert((await tileVal(l)) !== null, `service: ${l}`);
  // drill link inside a table + mobile
  await tab('direction'); const lb = await p.$('.linkbtn'); if (lb) { await lb.click(); await p.waitForTimeout(200); assert(await p.isVisible('.modal'), 'table figures drill down too'); await p.keyboard.press('Escape'); }
  await p.setViewportSize({ width: 390, height: 844 }); await go('#/boards'); await p.screenshot({ path: path.join(os.tmpdir(), 'db-mobile.png'), fullPage: false });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, 'no horizontal page scroll on a phone');
  assert(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(process.exitCode ? 'DASHBOARD CHECKS FAILED' : 'DASHBOARD CHECKS PASSED');
  await b.close();
})();
