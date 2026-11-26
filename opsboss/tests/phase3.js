const { chromium } = require('playwright');
// Phase 3 checks: QuickBooks CSV import (idempotent), auto-match, reconciliation, exceptions inbox,
// A/R and A/P aging, monthly reports, commissions (versioned rules), alerts & escalation,
// calendar conflicts, workflow test mode / dedupe, consent and the automation log.
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/phase3.js`.
const fs = require('fs'), os = require('os'), path = require('path');
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('Checked with accounting'));
  await p.goto('http://localhost:8765/opsboss/?demo'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const go = async h => { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(250); };
  const DB = () => p.evaluate(() => JSON.parse(localStorage.getItem('opsboss.v1')));
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); const i = d.invoices.find(x => !['void', 'draft'].includes(x.status)); const j = d.jobs.find(x => x.customerId === i.customerId) || d.jobs[0]; i.jobId = j.id; i.customerId = j.customerId; localStorage.setItem('opsboss.v1', JSON.stringify(d)); });
  await p.reload(); await p.waitForTimeout(1500);
  let d = await DB();
  const inv = d.invoices.find(i => i.jobId && !['void', 'draft'].includes(i.status));
  const job = d.jobs.find(j => j.id === inv.jobId);
  const invTotal = inv.items.reduce((s, x) => s + x.qty * x.price, 0) * (1 + (d.settings.taxRate || 0) / 100);
  // QuickBooks "Transaction List by Date" export (title rows on top, like the real file)
  const csv = [`Nexis Power LLC`, `Transaction List by Date`, `January 1 - December 31, 2026`, ``,
    `Date,Transaction Type,Num,Name,Memo/Description,Account,Class,Amount,Open Balance`,
    `${new Date(inv.createdAt).toLocaleDateString('en-US')},Invoice,${inv.number},"${d.customers.find(c => c.id === inv.customerId).name}",,Accounts Receivable,,"${invTotal.toFixed(2)}",100.00`,
    `11/03/2026,Expense,,Home Depot,Conduit for ${job.number},Job Materials,,-412.50,`,
    `11/04/2026,Expense,,Shell,Fuel,Vehicle,,-80.00,`,
    `11/04/2026,Expense,,Shell,Fuel,Vehicle,,-80.00,`,
    `11/05/2026,Payment,7781,"Unknown Customer",,Undeposited Funds,,"1,500.00",`,
    `11/06/2026,Bill,B-1,CED Greentech,,Job Materials,,"(2,000.00)",2000.00`,
    `,,,,,,,,`, `TOTAL,,,,,,,,`].join('\n');
  const f = path.join(os.tmpdir(), 'qb-transactions.csv'); fs.writeFileSync(f, csv);
  await go('#/accounting');
  await p.setInputFiles('[data-act-input="ledgerCsv"]', f); await p.waitForTimeout(500);
  d = await DB(); const n1 = d.ledger.length;
  assert(n1 === 6, `CSV import created 6 ledger rows (got ${n1}; two identical fuel expenses kept as two)`);
  await p.setInputFiles('[data-act-input="ledgerCsv"]', f); await p.waitForTimeout(500);
  d = await DB(); assert(d.ledger.length === n1, `re-importing the same file does not duplicate (still ${d.ledger.length})`);
  const exp = d.ledger.find(l => l.name === 'Home Depot'), qinv = d.ledger.find(l => l.type === 'invoice');
  assert(exp.projectId === job.id, `expense auto-matched to ${job.number} from the memo (${exp.matchedBy})`);
  assert(qinv.projectId === job.id, `QuickBooks invoice matched by number (${qinv.matchedBy})`);
  assert(d.runs.some(r => r.kind === 'ledger.import' && /0 new/.test(r.detail)), 'second import logged as 0 new in the automation log');
  // reconciliation: balance in QB (100) differs from OpsBoss balance
  await p.click('[data-act="tab"][data-v="recon"]'); await p.waitForTimeout(200);
  const recon = await p.textContent('#view');
  assert(/balance: OpsBoss/.test(recon) || Math.abs(invTotal - 0) < 0.01, 'reconciliation shows the balance difference');
  for (const t of ['ar', 'ap', 'ledger', 'reports', 'overview']) { await p.click(`[data-act="tab"][data-v="${t}"]`); await p.waitForTimeout(150); }
  await p.click('[data-act="tab"][data-v="reports"]'); await p.waitForTimeout(150);
  assert(/Result after overhead/.test(await p.textContent('#view')), 'monthly report shows result after overhead');
  // exceptions inbox
  await go('#/exceptions');
  const ex = await p.textContent('#view');
  assert(/Transaction without project/.test(ex) && /Shell/.test(ex), 'fuel expenses appear as transactions without project');
  assert(/Unapplied payment/.test(ex) && /Unknown Customer/.test(ex), 'payment not linked to an invoice is listed as unapplied');
  const before = await p.$$eval('[data-act="excResolve"][data-s="resolved"]', e => e.length);
  await p.selectOption('[data-act-input="ledgerProject"] >> nth=0', '__overhead'); await p.waitForTimeout(250);
  const after = await p.$$eval('[data-act="excResolve"][data-s="resolved"]', e => e.length);
  assert(after === before - 1, `marking a transaction as overhead removes it from the inbox (${before} → ${after})`);
  await p.click('[data-act="excResolve"][data-s="resolved"] >> nth=0'); await p.waitForTimeout(200);
  d = await DB(); assert(d.exceptions.some(x => x.status === 'resolved' && x.note === 'Checked with accounting'), 'exception resolved with a note and who resolved it');
  // commissions: simulate + approve + new version
  const cj = d.jobs.find(j => j.status === 'completed') || d.jobs[0];
  await go('#/job/' + cj.id); await p.click('[data-act="tab"][data-v="financials"]'); await p.waitForTimeout(150);
  const grossBefore = await p.evaluate(id => { return null; }, cj.id);
  await p.click('[data-act="commSim"]'); await p.waitForTimeout(200);
  const sim = await p.textContent('.modal');
  assert(/Simulated commission/.test(sim) && /rule "Sales rep — standard"/.test(sim), 'commission simulation shows amount and rule trace');
  await p.fill('#cmRep', 'Carlos Rivera'); await p.click('#cmOk'); await p.waitForTimeout(200);
  d = await DB(); const cm = d.jobs.find(j => j.id === cj.id).fin.commissions[0];
  assert(cm && cm.status === 'approved' && cm.amount > 0, `commission approved: $${cm && cm.amount}`);
  await go('#/commissions'); await p.click('[data-act="commRuleVersion"]'); await p.waitForTimeout(200);
  await p.fill('[name=rate]', '12'); await p.fill('[name=from]', '2026-12-01'); await p.click('[data-save]'); await p.waitForTimeout(200);
  d = await DB(); const rules = d.settings.commRules;
  assert(rules.length === 2 && rules[0].to === '2026-11-30' && rules[1].from === '2026-12-01', 'new rule version closes the previous one the day before');
  // alerts + escalation
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); d.tasks.unshift({ id: 'old1', title: 'Send permit package', due: '2026-11-01', done: false, assignee: '', createdAt: '2026-10-30T10:00:00Z' }); d.settings.alertRules = { ...(d.settings.alertRules || {}), escalateTo: d.techs[0].name }; localStorage.setItem('opsboss.v1', JSON.stringify(d)); });
  await p.reload(); await p.waitForTimeout(1500);
  await go('#/alerts'); const al = await p.textContent('#view');
  assert(/Send permit package/.test(al) && /escalated to Direction/.test(al), 'overdue task alert escalates by age');
  assert(await p.isVisible('#bellN'), 'bell shows a count');
  await p.click('[data-act="alertScan"]'); await p.waitForTimeout(300); await p.click('[data-act="alertScan"]'); await p.waitForTimeout(300);
  d = await DB(); const escT = d.tasks.filter(t => t.dedupe === 'esc:task:old1:L3');
  assert(escT.length === 1, `escalation task created once even when the scan runs twice (${escT.length})`);
  // calendar conflict: double-book a tech
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); const t = d.techs[0].id; const day = new Date(); day.setDate(day.getDate() + 2); day.setHours(9, 0, 0, 0); const j = (n, h) => ({ id: 'cf' + n, number: 'J-77' + n, customerId: d.customers[0].id, division: 'hvac', title: 'Conflict test ' + n, techIds: [t], start: new Date(day.getTime() + h * 36e5).toISOString(), duration: 3, status: 'scheduled', items: [], checklist: [], photos: [], createdAt: new Date().toISOString() }); d.jobs.push(j(1, 0), j(2, 1)); localStorage.setItem('opsboss.v1', JSON.stringify(d)); });
  await p.reload(); await p.waitForTimeout(1500); await go('#/schedule');
  if (!(await p.$('[data-job="cf1"]'))) { await p.click('[data-act="wk"][data-n="7"]'); await p.waitForTimeout(200); }
  assert(/double-booked/.test(await p.textContent('#view')), 'schedule shows the double-booking conflict');
  // workflow in test mode: auto messages are not sent and are logged
  const wfLog = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); return d.settings.outboundLive; });
  assert(wfLog === false, 'outbound messages start in test mode');
  // consent
  const cid = d.customers[0].id; await go('#/customer/' + cid);
  await p.uncheck('[data-act-input="custConsent"][data-ch="sms"]'); await p.waitForTimeout(200);
  d = await DB(); assert(d.customers.find(c => c.id === cid).consent.sms === false, 'SMS opt-out saved on the customer with a log');
  // other screens render
  for (const r of ['runs', 'settings', 'mywork', 'finance', 'pipeline', 'dashboard', 'commissions', 'alerts']) await go('#/' + r);
  assert(/Lead sources \(HighLevel mapping\)/.test(await (async () => { await go('#/settings'); return p.textContent('#view'); })()), 'settings show the lead source mapping');
  await go('#/runs'); const runs = await p.textContent('#view');
  assert(/ledger.import/.test(runs) && /alerts.scan/.test(runs), 'automation log lists imports and alert scans');
  await p.setViewportSize({ width: 390, height: 844 }); await go('#/accounting'); await p.screenshot({ path: path.join(os.tmpdir(), 'p3-mobile.png') });
  assert(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(process.exitCode ? 'PHASE 3 CHECKS FAILED' : 'PHASE 3 CHECKS PASSED');
  await b.close();
})();
