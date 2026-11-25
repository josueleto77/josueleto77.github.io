const { chromium } = require('playwright');
// Acceptance test from the Nexis Power OpsBoss spec (section 9).
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/acceptance-financial.js`.
const SP = require('os').tmpdir();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('Went with competitor'));
  await p.goto('http://localhost:8765/opsboss/?demo'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  // proyecto con contrato de $20,000
  const jid = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); const j = { id: 'acc1', number: 'J-9001', customerId: d.customers[3].id, division: 'solar', title: 'Acceptance test project', techIds: [], start: null, duration: 8, status: 'scheduled', items: [{ id: 'i1', name: 'Solar contract', qty: 1, price: 20000, cost: 0 }], checklist: [], photos: [], notes: '', createdAt: new Date().toISOString() }; d.jobs.unshift(j); localStorage.setItem('opsboss.v1', JSON.stringify(d)); return j.id; });
  await p.reload(); await p.waitForTimeout(1500);
  const go = async h => { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(200); };
  const fin = async () => { await go('#/job/' + jid); await p.click('[data-act="tab"][data-v="financials"]'); await p.waitForTimeout(150); return await p.$$eval('.card:first-child table tr', rs => Object.fromEntries(rs.map(r => { const t = r.querySelectorAll('td'); return [t[0].childNodes[0].textContent.trim(), t[1].querySelector('input') ? t[1].querySelector('input').value : t[1].textContent.trim()]; }))); };
  await fin();
  await p.click('[data-act="lockBudget"]'); await p.waitForTimeout(150);
  // orden de cambio $2,000 aprobada
  await p.click('[data-act="addCO"]'); await p.waitForTimeout(300); await p.fill('[name=desc]', 'Extra battery conduit run'); await p.fill('[name=price]', '2000'); await p.fill('[name=cost]', '0'); await p.click('[data-save]'); await p.waitForTimeout(150);
  await p.click('[data-act="coSet"][data-s="approved"]'); await p.waitForTimeout(150);
  console.log('CO after approve:', await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('opsboss.v1')).jobs.find(j => j.id === 'acc1').fin.changeOrders.map(c => c.status + ":" + c.price))));
  // PO comprometido $3,000
  await p.click('[data-act="newPO"]'); await p.fill('[name=vendor]', 'CED Greentech'); await p.fill('[name=amount]', '3000'); await p.click('[data-save]'); await p.waitForTimeout(150);
  // costo real $12,000 (factura de proveedor dividida: 10,000 a este proyecto + 2,000 a otro)
  await go('#/purchasing'); await p.click('[data-act="newBill"]'); await p.waitForTimeout(150);
  await p.fill('[data-b="vendor"]', 'Sunrise Subcontracting'); await p.fill('[data-b="number"]', 'B-77');
  await p.selectOption('[data-l="0"][data-f="projectId"]', jid); await p.waitForTimeout(80); await p.fill('[data-l="0"][data-f="amount"]', '12000');
  await p.click('#addLine'); await p.waitForTimeout(80); const other = await p.evaluate(() => JSON.parse(localStorage.getItem('opsboss.v1')).jobs.find(j => j.id !== 'acc1').id);
  await p.selectOption('[data-l="1"][data-f="projectId"]', other); await p.waitForTimeout(80); await p.fill('[data-l="1"][data-f="amount"]', '2000');
  await p.click('#billSave'); await p.waitForTimeout(200);
  // estimación restante $1,000
  await fin(); await p.fill('[data-act-input="finRemaining"]', '1000'); await p.press('[data-act-input="finRemaining"]', 'Tab'); await p.waitForTimeout(250);
  const r1 = await fin();
  console.log('STEP 1', JSON.stringify({ revenue: r1['Approved contract value (expected revenue)'], actual: r1['Actual cost'], committed: r1['+ Pending commitments'], remaining: r1['+ Remaining cost estimate'], projected: r1['Projected final cost'], gross: r1['Projected gross profit'] }));
  // factura de los $3,000 comprometidos
  await go('#/purchasing'); await p.click('[data-act="newBill"]'); await p.waitForTimeout(150);
  await p.fill('[data-b="vendor"]', 'CED Greentech'); await p.fill('[data-b="number"]', 'INV-555');
  await p.selectOption('[data-l="0"][data-f="projectId"]', jid); await p.waitForTimeout(80);
  const poVal = await p.$eval('[data-l="0"][data-f="poId"] option:nth-child(2)', o => o.value); await p.selectOption('[data-l="0"][data-f="poId"]', poVal); await p.waitForTimeout(120);
  await p.click('#billSave'); await p.waitForTimeout(200);
  const r2 = await fin();
  console.log('STEP 2', JSON.stringify({ actual: r2['Actual cost'], committed: r2['+ Pending commitments'], projected: r2['Projected final cost'], gross: r2['Projected gross profit'] }));
  // facturar todo y cobrar $10,000
  await p.click('[data-act="tab"][data-v="billing"]'); await p.waitForTimeout(100); await p.click('[data-act="invoiceJob"]'); await p.waitForTimeout(250);
  await p.click('[data-act="sendInv"]'); await p.waitForTimeout(200); await p.keyboard.press('Escape');
  await p.click('[data-act="payInv"]'); await p.fill('[name=amount]', '10000'); await p.click('[data-save]'); await p.waitForTimeout(250);
  await go('#/job/' + jid); await p.click('[data-act="tab"][data-v="billing"]'); await p.waitForTimeout(150);
  const k = await p.$$eval('.grid.g4 .kpi', e => e.map(x => x.querySelector('.l').textContent + ': ' + x.querySelector('.v').textContent));
  console.log('STEP 3', k.join(' | '));
  await p.screenshot({ path: SP + '/acc-billing.png' });
  await p.click('[data-act="tab"][data-v="financials"]'); await p.waitForTimeout(150); await p.screenshot({ path: SP + '/acc-fin.png', fullPage: true });
  // otras pantallas
  for (const r of ['mywork', 'finance', 'purchasing', 'duplicates', 'pipeline', 'jobs', 'customers', 'dashboard']) await go('#/' + r);
  await go('#/job/' + jid); for (const t of ['workflow', 'specs', 'history', 'overview']) { await p.click(`[data-act="tab"][data-v="${t}"]`); await p.waitForTimeout(100); }
  await p.click('[data-act="tab"][data-v="workflow"]'); await p.waitForTimeout(100); await p.click('[data-act="stageAdvance"]'); await p.waitForTimeout(150);
  console.log('exception modal:', await p.textContent('.modal-h h2').catch(() => 'none'));
  await p.fill('#excReason', 'Survey done by partner'); await p.click('#excGo'); await p.waitForTimeout(150);
  console.log('stages done:', await p.$$eval('.steps .on', e => e.map(x => x.textContent).join(' > ')));
  await p.screenshot({ path: SP + '/acc-workflow.png' });
  const ok = r1['Approved contract value (expected revenue)'] === '$22,000.00' && r1['Projected final cost'] === '$16,000.00' && r1['Projected gross profit'].startsWith('$6,000.00 · 27.27%') && r2['Actual cost'] === '$15,000.00' && r2['Projected final cost'] === '$16,000.00' && k.some(x => x === 'Balance due: $12,000.00');
  console.log(ok && !errs.length ? 'ACCEPTANCE PASSED' : 'ACCEPTANCE FAILED', errs.length ? errs : ''); await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
