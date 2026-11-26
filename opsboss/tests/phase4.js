const { chromium } = require('playwright');
// Phase 4 checks: mobile work order (hours, materials, serials, problem report, sign-off), completion →
// handover tasks + warranties + customer equipment, service tickets (visit, time, parts, warranty cost to the
// original project, billable invoice), service dashboard and the customer project portal (mocked backend).
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/phase4.js`.
const path = require('path'), os = require('os');
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('REG-555'));
  await p.goto('http://localhost:8765/opsboss/?demo'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const go = async h => { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(250); };
  const DB = () => p.evaluate(() => JSON.parse(localStorage.getItem('opsboss.v1')));
  const fill = async (sel, v) => { await p.fill(sel, String(v)); };
  // a solar project in progress, all required photos taken (local data URLs)
  const jid = await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('opsboss.v1')); const t = d.techs.find(x => x.division === 'solar') || d.techs[0];
    const j = { id: 'wo1', number: 'J-5001', customerId: d.customers[1].id, division: 'solar', title: '8 kW solar + battery', techIds: [t.id], start: new Date().toISOString(), duration: 8, status: 'inprogress', items: [{ id: 'i1', name: 'Solar system 8 kW', qty: 1, price: 24000, cost: 15000 }], checklist: [], photos: [], reqPhotos: [], createdAt: new Date().toISOString() };
    d.jobs.unshift(j); localStorage.setItem('opsboss.v1', JSON.stringify(d)); return j.id;
  });
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); const reqs = (d.settings.photoReqs && d.settings.photoReqs.solar) || null; localStorage.setItem('reqs', JSON.stringify(reqs)); });
  await go('#/field'); assert(/Field work orders/.test(await p.textContent('#view')), 'field page lists work orders');
  await go('#/wo/' + jid); const wo = await p.textContent('#view');
  assert(/Clock in|Who are you/.test(wo) && /Equipment & serial numbers/.test(wo) && /Handover checklist/.test(wo), 'work order shows time, serials and handover sections');
  const sel = await p.$('[data-act-input="iam"]'); if (sel) { const v = await p.$eval('[data-act-input="iam"] option:nth-child(2)', o => o.value); await p.selectOption('[data-act-input="iam"]', v); await p.waitForTimeout(150); }
  await p.click('[data-act="woClock"]'); await p.waitForTimeout(150);
  await p.evaluate(id => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); const j = d.jobs.find(x => x.id === id); const k = Object.keys(j.clock)[0]; j.clock[k] = new Date(Date.now() - 2.5 * 36e5).toISOString(); localStorage.setItem('opsboss.v1', JSON.stringify(d)); }, jid);
  await p.reload(); await p.waitForTimeout(1300); await go('#/wo/' + jid);
  await p.click('[data-act="woClock"]'); await p.waitForTimeout(150);
  let d = await DB(); let j = d.jobs.find(x => x.id === jid);
  assert(j.fin.labor.length === 1 && j.fin.labor[0].hours === 2.5, `clock in/out logged ${j.fin.labor[0] && j.fin.labor[0].hours} h`);
  await p.click('[data-act="woMat"]'); await p.waitForTimeout(150);
  const pbv = await p.$eval('[name=pb] option:nth-child(2)', o => o.value); await p.selectOption('[name=pb]', pbv); await fill('[name=qty]', 3); await p.click('[data-save]'); await p.waitForTimeout(150);
  d = await DB(); j = d.jobs.find(x => x.id === jid);
  assert(j.materials.length === 1 && j.fin.costs.some(c => c.materialId === j.materials[0].id), 'material logged and its cost posted to the project');
  for (const t of ['Inverter / microinverters', 'Battery', 'Production meter / gateway', 'Solar modules (one serial is enough)']) {
    await p.click(`[data-act="woEquip"][data-t="${t}"]`); await p.waitForTimeout(120); await fill('[name=brand]', 'Enphase'); await fill('[name=serial]', 'SN-' + t.length); await p.click('[data-save]'); await p.waitForTimeout(120);
  }
  await p.click('[data-act="woIssue"]'); await p.waitForTimeout(120); await fill('[name=text]', 'Rafter cracked near array'); await p.click('[data-save]'); await p.waitForTimeout(150);
  d = await DB(); j = d.jobs.find(x => x.id === jid);
  assert(j.installedEquip.length === 4 && j.issues.length === 1, 'serials recorded and problem reported');
  assert(d.tasks.some(t => /Field problem J-5001/.test(t.title)), 'problem report created a task for the office');
  // signature
  await p.click('[data-act="woSign"]'); await p.waitForTimeout(200); await fill('#sgName', 'Maria Lopez');
  const box = await (await p.$('#sgPad')).boundingBox(); await p.mouse.move(box.x + 20, box.y + 40); await p.mouse.down(); await p.mouse.move(box.x + 120, box.y + 90, { steps: 8 }); await p.mouse.move(box.x + 200, box.y + 40, { steps: 8 }); await p.mouse.up();
  await p.click('#sgOk'); await p.waitForTimeout(200);
  d = await DB(); j = d.jobs.find(x => x.id === jid); assert(j.signoff && j.signoff.name === 'Maria Lopez' && /^data:image\/png/.test(j.signoff.sig), 'customer signed on screen');
  // fill required photos (local) and complete
  await p.evaluate(id => { const d = JSON.parse(localStorage.getItem('opsboss.v1')); const j = d.jobs.find(x => x.id === id); j.photoBypass = true; localStorage.setItem('opsboss.v1', JSON.stringify(d)); }, jid);
  await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(id => { const reqs = window.__photoReqsForTest; }, jid);
  // take every required photo via the real UI
  await go('#/photos/' + jid);
  const png = path.join(os.tmpdir(), 'p4.png'); await p.screenshot({ path: png, clip: { x: 0, y: 0, width: 50, height: 50 } });
  let guard = 0; while ((await p.$$('[data-act-input="reqPhoto"]')).length && guard++ < 40) { const inputs = await p.$$('label.btn.primary [data-act-input="reqPhoto"]'); if (!inputs.length) break; await inputs[0].setInputFiles(png); await p.waitForTimeout(350); }
  await go('#/wo/' + jid); await p.click('[data-act="jobStatus"][data-s="completed"]'); await p.waitForTimeout(400);
  d = await DB(); j = d.jobs.find(x => x.id === jid);
  assert(j.status === 'completed', 'job completed');
  const ws = d.warranties.filter(w => w.jobId === jid);
  assert(ws.length === 5 && ws.some(w => w.needsRegistration && !w.registered), `warranties started on completion (${ws.length}), manufacturer ones need registration`);
  assert(d.customers[1].equipment.filter(e => e.fromJob === jid).length === 4, 'installed equipment saved on the customer with serials');
  assert(d.tasks.some(t => t.dedupe === 'wreg:' + jid + ':Inverter / microinverters'), 'registration task created');
  assert(d.tasks.some(t => t.dedupe === 'ho:' + jid + ':inspections') || !d.permits.some(x => x.jobId === jid), 'handover task created for missing items');
  // service ticket under warranty → cost lands on the original project
  await go('#/service'); await p.click('[data-act="tkNew"]'); await p.waitForTimeout(200);
  await p.selectOption('[name=customerId]', d.customers[1].id); await p.waitForTimeout(80); await p.selectOption('[name=jobId]', jid);
  await fill('[name=title]', 'Inverter shows red light'); await p.selectOption('[name=assignee] >> nth=0', j.techIds[0]).catch(() => {}); await p.click('[data-save]'); await p.waitForTimeout(400);
  d = await DB(); const tk = d.tickets[0];
  assert(tk && tk.warranty === true && /^T-\d+/.test(tk.number), `ticket ${tk && tk.number} detected as under warranty`);
  await p.click('[data-act="tkVisit"]'); await p.waitForTimeout(250); await p.click('[data-save]'); await p.waitForTimeout(300);
  await go('#/ticket/' + tk.id);
  await p.click('[data-act="tkTime"]'); await p.waitForTimeout(150); await p.selectOption('[name=techId]', j.techIds[0]); await fill('[name=hours]', 2); await p.click('[data-save]'); await p.waitForTimeout(150);
  await p.click('[data-act="tkPart"]'); await p.waitForTimeout(150); await fill('[name=name]', 'Replacement microinverter'); await fill('[name=qty]', 1); await fill('[name=cost]', 180); await p.click('[data-save]'); await p.waitForTimeout(150);
  await p.click('[data-act="tkResolve"]'); await p.waitForTimeout(150); await fill('[name=resolution]', 'Replaced microinverter under warranty'); await p.click('[data-save]'); await p.waitForTimeout(250);
  d = await DB(); j = d.jobs.find(x => x.id === jid); const t2 = d.tickets.find(x => x.id === tk.id);
  const wc = j.fin.costs.filter(c => c.ticketId === tk.id);
  assert(t2.status === 'resolved' && t2.visitJobId && wc.length === 1 && wc[0].category === 'Warranty' && wc[0].amount > 180, `warranty cost ${wc[0] && wc[0].amount} charged to ${j.number} as Warranty`);
  // billable ticket → invoice
  await p.click('[data-act-input="tkWarranty"]'); await p.waitForTimeout(200);
  d = await DB(); j = d.jobs.find(x => x.id === jid); assert(!j.fin.costs.some(c => c.ticketId === tk.id), 'marking billable removes the warranty cost (no double count)');
  await p.click('[data-act="tkInvoice"]'); await p.waitForTimeout(300);
  d = await DB(); const inv = d.invoices.find(i => i.id === d.tickets.find(x => x.id === tk.id).invoiceId);
  assert(inv && inv.items.length === 2 && inv.items[0].price === 125, `service invoice ${inv && inv.number} with labor at $125/h and marked-up part`);
  await go('#/service'); const sv = await p.textContent('#view'); assert(/Avg. resolution/.test(sv) && /Open tickets/.test(sv), 'service dashboard shows KPIs');
  for (const t of ['warranties', 'repeats', 'tickets']) { await p.click(`[data-act="tab"][data-v="${t}"]`); await p.waitForTimeout(120); }
  await p.click('[data-act="tab"][data-v="warranties"]'); await p.waitForTimeout(120); await p.click('[data-act="wReg"]'); await p.waitForTimeout(200);
  d = await DB(); assert(d.warranties.some(w => w.registered && w.regNumber === 'REG-555'), 'warranty marked registered with its number');
  await go('#/alerts'); await go('#/job/' + jid); await go('#/settings');
  assert(/Field, handover & warranties/.test(await p.textContent('#view')), 'settings show serial and warranty rules');
  await p.screenshot({ path: path.join(os.tmpdir(), 'p4-wo.png'), fullPage: false });
  // customer project portal with a mocked backend
  const pp = await b.newPage({ viewport: { width: 390, height: 844 } }); const perr = []; pp.on('pageerror', e => perr.push(e.message));
  let sent = null;
  await pp.exposeFunction('__sr', a => { sent = a; });
  await pp.addInitScript(() => {
    const data = { company: { name: 'Nexis Power', phone: '555', email: 'x@y.z' }, customer: { name: 'Maria Lopez', address: '1 Main', city: 'Boston' },
      project: { number: 'J-5001', title: '8 kW solar + battery', division: 'solar', status: 'inprogress', stage: 'permits', portalNote: 'Permit filed', equipment: [{ type: 'Inverter', brand: 'Enphase', serial: 'SN1' }] },
      estimate: { number: 'E-1', status: 'approved', token: 'a'.repeat(64) }, invoices: [{ number: 'INV-1', kind: 'deposit', total: 1000, paid: 400, due: '2026-12-01', token: 'b'.repeat(64) }],
      permits: [{ type: 'Building', status: 'submitted' }], visits: [{ title: 'Install', start: new Date(Date.now() + 864e5).toISOString() }], appointments: [], warranties: [{ type: 'Workmanship', provider: 'Nexis Power', end: '2036-11-26' }], tickets: [] };
    Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({ rpc: async (fn, a) => fn === 'opsboss_portal_project' ? { data } : fn === 'opsboss_portal_service_request' ? (window.__sr(a), data.tickets.push({ number: 'T-1001', title: a.p_title, status: 'new' }), { data: { ok: true, number: 'T-1001' } }) : { data: { error: 'x' } } }) }; }, set() {} });
  });
  await pp.goto('http://localhost:8765/opsboss/portal.html?p=' + 'c'.repeat(64)); await pp.waitForTimeout(1200);
  const pt = await pp.textContent('#portal');
  assert(/Permits & utility approval/.test(pt) && /Now/.test(pt) && /Balance due: \$600\.00/.test(pt) && /Permit filed/.test(pt), 'portal shows progress, message and balance due');
  assert(!/cost|margin/i.test(pt), 'portal shows no costs or margins');
  await pp.fill('#srTitle', 'Panel loose'); await pp.click('#srSend'); await pp.waitForTimeout(400);
  assert(sent && sent.p_title === 'Panel loose' && /T-1001/.test(await pp.textContent('#portal')), 'service request sent from the portal and shown');
  await pp.screenshot({ path: path.join(os.tmpdir(), 'p4-portal.png'), fullPage: true });
  assert(!errs.length && !perr.length, 'no page errors' + (errs.length || perr.length ? ': ' + [...errs, ...perr].join(' | ') : ''));
  console.log(process.exitCode ? 'PHASE 4 CHECKS FAILED' : 'PHASE 4 CHECKS PASSED');
  await b.close();
})();
