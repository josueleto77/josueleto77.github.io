const { chromium } = require('playwright');
// Pipeline editor (create, rename stages, add/move/delete stages, delete pipeline moving its leads),
// lead modal pipeline/stage selection, project Scope & materials tab and the printable Project sheet.
// Run: serve the repo root on :8765 (python3 -m http.server 8765) then `node opsboss/tests/pipelines.js`.
const os = require('os'), path = require('path');
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('Not now'));
  await p.goto('http://localhost:8765/opsboss/?demo'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const go = async h => { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(250); };
  const DB = () => p.evaluate(() => JSON.parse(localStorage.getItem('opsboss.v1')));
  await go('#/pipeline'); assert(await p.$('a[href="#/pipelinesEdit"]'), 'Edit pipelines button on the board');
  await go('#/pipelinesEdit');
  // new pipeline
  await p.click('[data-act="pipeNew"]'); await p.waitForTimeout(150); await p.fill('[name=name]', 'Batteries'); await p.selectOption('[name=division]', 'solar'); await p.click('[data-save]'); await p.waitForTimeout(400);
  let d = await DB(); const bat = d.settings.pipelines.find(x => x.name === 'Batteries');
  assert(bat && bat.stages.length === 7 && d.settings.pipelines.length === 5, 'new pipeline created with basic stages');
  const bi = d.settings.pipelines.indexOf(bat);
  // rename stage, add stage, move, delete
  await p.fill(`[data-act-input="stageName"][data-p="${bi}"][data-s="1"]`, 'Called'); await p.press(`[data-act-input="stageName"][data-p="${bi}"][data-s="1"]`, 'Tab'); await p.waitForTimeout(200);
  await p.fill(`[data-stage-add="${bi}"] [name=stage]`, 'Utility approval'); await p.selectOption(`[data-stage-add="${bi}"] [name=after]`, '3'); await p.click(`[data-stage-add="${bi}"] button`); await p.waitForTimeout(250);
  d = await DB(); let st = d.settings.pipelines[bi].stages;
  assert(st[1][1] === 'Called' && st[4][1] === 'Utility approval', 'stage renamed and new stage inserted after Proposal sent');
  await p.click(`[data-act="stageMove"][data-p="${bi}"][data-s="4"][data-d="-1"]`); await p.waitForTimeout(200);
  d = await DB(); st = d.settings.pipelines[bi].stages; assert(st[3][1] === 'Utility approval', 'stage moved up');
  assert(!(await p.$(`[data-act="stageDel"][data-p="${bi}"][data-s="0"]`)), 'system stage "New lead" cannot be deleted');
  // rename a default pipeline stage
  await p.fill('[data-act-input="stageName"][data-p="2"][data-s="5"]', 'Insurance / adjuster'); await p.press('[data-act-input="stageName"][data-p="2"][data-s="5"]', 'Tab'); await p.waitForTimeout(200);
  // lead in new pipeline
  await go('#/pipeline'); await p.click(`[data-act="filt"][data-f="pipe"][data-v="${bat.key}"]`); await p.waitForTimeout(200);
  const cols = await p.$$eval('.kcol-h span:first-child', c => c.map(x => x.textContent.replace(/\s+\d+$/, '').trim()));
  assert(cols.includes('Called') && cols.includes('Utility approval'), 'board shows the edited stages: ' + cols.join(' > '));
  await p.click('[data-act="newLead"]'); await p.waitForTimeout(200);
  assert(await p.$eval('[name=pipeKey]', s => s.value) === bat.key, 'new lead defaults to the open pipeline');
  await p.selectOption('[name=customerId]', { index: 2 }); await p.fill('[name=title]', '13.5 kWh Powerwall'); await p.selectOption('[name=stage]', st[3][0]); await p.click('[data-save]'); await p.waitForTimeout(300);
  d = await DB(); const lead = d.leads.find(l => l.title === '13.5 kWh Powerwall');
  assert(lead && lead.pipeline === bat.key && lead.stage === st[3][0], 'lead saved in the custom pipeline and stage');
  assert(/13\.5 kWh Powerwall/.test(await p.textContent('.kanban')), 'lead appears on the custom board');
  await go('#/pipeline'); await p.click('[data-act="filt"][data-f="pipe"][data-v="roofing"]'); await p.waitForTimeout(200);
  assert(/Insurance \/ adjuster/.test(await p.textContent('.kanban')), 'renamed default stage shown on Roofing board');
  // delete pipeline → move leads
  await go('#/pipelinesEdit'); await p.click(`[data-act="pipeDel"][data-p="${bi}"]`); await p.waitForTimeout(150); await p.selectOption('#pdTo', 'solar'); await p.click('#pdGo'); await p.waitForTimeout(300);
  d = await DB(); const moved = d.leads.find(l => l.title === '13.5 kWh Powerwall');
  assert(!d.settings.pipelines.some(x => x.name === 'Batteries') && moved.pipeline === 'solar' && moved.stage === 'new', 'pipeline deleted, its lead moved to Solar (stage reset to New lead)');
  // project scope tab + sheet
  const j = d.jobs.find(x => x.division === 'hvac' && x.items.length);
  await go('#/job/' + j.id); await p.click('[data-act="tab"][data-v="scope"]'); await p.waitForTimeout(250);
  const sc = await p.textContent('#view');
  assert(/Equipment/.test(sc) && /Adders/.test(sc) && /Materials/.test(sc) && /Labor & services/.test(sc) && /planned vs used/.test(sc), 'Scope & materials tab shows equipment, adders, materials, services and planned vs used');
  await p.click('[data-act="scopeAdd"][data-g="adders"]'); await p.waitForTimeout(250);
  const opts = await p.$$eval('#pbl tr td:first-child', t => t.map(x => x.textContent));
  assert(opts.length > 0, 'price-book picker lists items for that group (or the whole service when the group is empty): ' + opts.length);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await p.click('a[href="#/sheet/' + j.id + '"]'); await p.waitForTimeout(300);
  const sh = await p.textContent('#view');
  assert(/Customer & property/.test(sh) && /Scope, adders & materials/.test(sh) && /Costs & profitability/.test(sh) && /Invoices & payments/.test(sh) && /Photos & sign-off/.test(sh), 'Project sheet shows customer, project, scope, costs, invoices and sign-off');
  await p.screenshot({ path: path.join(os.tmpdir(), 'sheet.png'), fullPage: true });
  await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(100);
  assert(!(await p.isVisible('.sidebar')), 'print view hides the menu');
  assert(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(process.exitCode ? 'PIPELINE CHECKS FAILED' : 'PIPELINE CHECKS PASSED');
  await b.close();
})();
