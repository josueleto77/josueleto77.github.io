/* ============================================================
   Practice Center: Utility Bill Lab, BTU Estimator, Zone Planning Lab,
   Solar Objection Simulator, HVAC Roleplay Center, Mass Save Programs
   ============================================================ */

function renderPracticeHubPage() {
  var st = NexisState.get();
  function labCard(icon, title, desc, route, done, badgeName) {
    return '<div class="card card-hover" style="cursor:pointer;" onclick="navigate(\'' + route + '\')">' +
      '<div class="flex-between"><span style="font-size:1.5rem;">' + icon + '</span>' + (done ? '<span class="pill pill-green">Complete</span>' : '') + '</div>' +
      '<h3 class="mt-16">' + escapeHtml(title) + '</h3><p class="small">' + escapeHtml(desc) + '</p>' +
      (badgeName ? '<span class="tiny muted">🏅 ' + escapeHtml(badgeName) + '</span>' : '') +
    '</div>';
  }
  return (
    '<div class="section-head"><div><span class="eyebrow">Practice Center</span><h1>Hands-on labs & simulations</h1></div></div>' +
    '<h2>Solar</h2><div class="grid grid-3 mt-16">' +
      labCard('🧾', 'Utility Bill Lab', 'Practice reading National Grid and Eversource bills.', 'practice/utility-bill-lab', !!(st.progress.solar.labsDone['utility-bill-ng'] && st.progress.solar.labsDone['utility-bill-ev']), 'Utility Bill Specialist') +
      labCard('🛡️', 'Objection Simulator', 'LAER framework against 8 realistic homeowner objections.', 'practice/objection-simulator', !!st.progress.solar.labsDone['objection-sim'], 'Solar Objection Specialist') +
    '</div>' +
    '<h2 class="mt-32">HVAC</h2><div class="grid grid-3 mt-16">' +
      labCard('🌡️', 'Preliminary BTU Estimator', 'Sales pre-qualification only — not final HVAC design.', 'practice/btu-lab', !!st.progress.hvac.labsDone['btu-lab'], 'BTU Fundamentals') +
      labCard('🏠', 'Zone Planning Lab', 'Estimate likely zones from sample floor plans.', 'practice/zone-lab', !!st.progress.hvac.labsDone['zone-lab'], 'Comfort Zoning') +
      labCard('🎭', 'HVAC Roleplay Center', '6 scored scenarios from oil-heat colonials to rebate questions.', 'practice/hvac-roleplay', !!st.progress.hvac.labsDone['hvac-roleplay'], 'HVAC Objection Specialist') +
    '</div>' +
    '<h2 class="mt-32">Programs & Cross-Service</h2><div class="grid grid-3 mt-16">' +
      labCard('📗', 'Mass Save Programs', 'Admin-editable incentive database — verify before quoting.', 'practice/mass-save-programs', false, null) +
      labCard('⚡', 'Energy Advisor Practical', 'The whole-home capstone case (unlocks after Energy Advisor exam).', 'practice/energy-advisor-practical', NexisState.hasPassedPractical('energy-advisor'), 'Whole-Home Energy Specialist') +
    '</div>'
  );
}

// ---------------- Utility Bill Lab ----------------
function renderUtilityBillLabPage(tab) {
  tab = tab === 'eversource' ? 'eversource' : 'nationalGrid';
  var data = UTILITY_BILL_LAB[tab];
  window._billLabState = window._billLabState || {};
  window._billLabState[tab] = window._billLabState[tab] || {};
  return (
    '<a class="tiny muted" href="#/practice" style="text-decoration:none;">← Back to Practice Center</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Solar Practice Center</span><h1>Utility Bill Lab</h1><p class="mb-0">Practice analyzing real Massachusetts utility bill structures before you’re in front of a customer.</p></div></div>' +
    '<div class="tag-row mt-8">' +
      '<button class="btn ' + (tab === 'nationalGrid' ? 'btn-dark' : 'btn-outline') + ' btn-sm" onclick="navigate(\'practice/utility-bill-lab/national-grid\')">National Grid</button>' +
      '<button class="btn ' + (tab === 'eversource' ? 'btn-dark' : 'btn-outline') + ' btn-sm" onclick="navigate(\'practice/utility-bill-lab/eversource\')">Eversource</button>' +
    '</div>' +
    '<div class="card mt-16"><h3>' + data.name + ' bill structure</h3><p class="small">' + escapeHtml(data.summary) + '</p>' +
      '<table class="lesson-table"><thead><tr><th>Line item</th><th>Category</th><th>What it means</th></tr></thead><tbody>' +
      data.lineItems.map(function (li) { return '<tr><td>' + escapeHtml(li.label) + '</td><td><span class="pill ' + (li.kind === 'supply' ? 'pill-orange' : 'pill-blue') + '">' + li.kind + '</span></td><td>' + escapeHtml(li.note) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="tiny muted mt-8">' + escapeHtml(data.usageChartNote) + '</p></div>' +
    '<h3 class="mt-24">Practice questions</h3>' +
    data.questions.map(function (q, i) { return renderInlineQuizCard('bill-' + tab, i, q); }).join('') +
    '<div class="card mt-16 text-center"><button class="btn btn-primary" onclick="completeBillLabTab(\'' + tab + '\')">Mark ' + data.name + ' Complete</button></div>'
  );
}
function completeBillLabTab(tab) {
  var courseId = 'solar';
  NexisState.markLabComplete(courseId, tab === 'nationalGrid' ? 'utility-bill-ng' : 'utility-bill-ev');
  var p = NexisState.courseProgress(courseId);
  if (p.labsDone['utility-bill-ng'] && p.labsDone['utility-bill-ev']) {
    NexisState.awardBadge('spec-utility-bill');
    alert('Utility Bill Specialist badge earned!');
  }
  navigate('practice');
}

// generic inline quiz card used by several labs (instant feedback, one attempt)
var _labAnswerLog = {};
function renderInlineQuizCard(ns, i, q) {
  var id = ns + '-' + i;
  return '<div class="card mt-16" id="lab-q-' + id + '">' +
    '<p style="font-weight:700;">' + (i + 1) + '. ' + escapeHtml(q.q) + '</p>' +
    q.choices.map(function (c, ci) {
      return '<div class="quiz-option" onclick="answerLabQuestion(\'' + ns + '\',' + i + ',' + ci + ')" id="lab-q-' + id + '-opt-' + ci + '">' +
        '<span class="quiz-letter">' + String.fromCharCode(65 + ci) + '</span><span>' + escapeHtml(c) + '</span></div>';
    }).join('') +
    '<p class="tiny mt-8" id="lab-q-' + id + '-explain" style="display:none;color:var(--ink-soft);"></p>' +
  '</div>';
}
function answerLabQuestion(ns, i, ci) {
  var key = ns + '-' + i;
  if (_labAnswerLog[key] !== undefined) return;
  _labAnswerLog[key] = ci;
  // question source resolution: bill labs, zone lab
  var q;
  if (ns.indexOf('bill-') === 0) q = UTILITY_BILL_LAB[ns.replace('bill-', '')].questions[i];
  else if (ns === 'zone') q = ZONE_LAB_QUESTIONS[i];
  if (!q) return;
  q.choices.forEach(function (c, idx) {
    var el = qs('#lab-q-' + key + '-opt-' + idx);
    if (idx === q.answerIndex) el.classList.add('correct');
    else if (idx === ci) el.classList.add('incorrect');
  });
  var ex = qs('#lab-q-' + key + '-explain');
  ex.style.display = 'block';
  ex.textContent = (ci === q.answerIndex ? '✓ Correct. ' : '✗ Not quite. ') + q.explain;
}

// ---------------- BTU Estimator Lab ----------------
function renderBtuLabPage() {
  return (
    '<a class="tiny muted" href="#/practice" style="text-decoration:none;">← Back to Practice Center</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">HVAC Practice Center</span><h1>Preliminary BTU Estimator</h1></div></div>' +
    '<div class="callout compliance"><h4>FOR SALES PRE-QUALIFICATION ONLY</h4><p class="mb-0">NOT FINAL HVAC DESIGN. The final equipment selection must be verified through qualified HVAC design, manufacturer data, and appropriate load calculations.</p></div>' +
    '<div class="card mt-16">' +
      '<div class="field"><label>Room size (sq. ft.)</label><input type="number" id="btu-sqft" value="250" min="20" max="2000"></div>' +
      '<div class="field"><label>Room / insulation condition</label><select id="btu-condition">' +
        BTU_FACTORS.map(function (f) { return '<option value="' + f.key + '">' + escapeHtml(f.label) + ' (' + f.low + '–' + f.high + ' BTU/sq ft)</option>'; }).join('') +
      '</select></div>' +
      '<button class="btn btn-primary" onclick="calcBtu()">Estimate Load</button>' +
      '<div id="btu-result" class="mt-16"></div>' +
    '</div>' +
    '<div class="card mt-16 text-center"><button class="btn btn-outline" onclick="markBtuLabComplete()">Mark Lab Complete</button></div>'
  );
}
function calcBtu() {
  var sqft = parseFloat(qs('#btu-sqft').value) || 0;
  var key = qs('#btu-condition').value;
  var f = BTU_FACTORS.find(function (x) { return x.key === key; });
  var low = Math.round(sqft * f.low);
  var high = Math.round(sqft * f.high);
  var typical = Math.round(sqft * f.typical);
  qs('#btu-result').innerHTML =
    '<div class="callout tip"><h4>Estimated load</h4><p class="mb-0">' + sqft + ' sq. ft. × ' + f.typical + ' BTU/sq ft (typical) ≈ <strong>' + typical.toLocaleString() + ' BTU</strong>. Full range: ' + low.toLocaleString() + '–' + high.toLocaleString() + ' BTU.</p></div>' +
    (f.designReview ? '<div class="callout compliance mt-16"><h4>Design review required</h4><p class="mb-0">Sunrooms, attics, and high-glass rooms carry heat-load risk a simple sq-ft estimate does not capture. Flag for HVAC design review.</p></div>' : '') +
    '<p class="tiny muted mt-8">The final equipment selection must be verified through qualified HVAC design, manufacturer data, and appropriate load calculations.</p>';
}
function markBtuLabComplete() {
  NexisState.markLabComplete('hvac', 'btu-lab');
  NexisState.awardBadge('spec-btu-fundamentals');
  alert('BTU Fundamentals badge earned!');
  navigate('practice');
}

// ---------------- Zone Planning Lab ----------------
function renderZoneLabPage() {
  var layoutsHtml = ZONE_LAB_LAYOUTS.map(function (l) {
    return '<div class="card mt-16"><h3>' + escapeHtml(l.name) + '</h3><p class="small">' + escapeHtml(l.description) + '</p>' +
      '<p style="font-weight:700;">' + escapeHtml(l.prompt) + '</p>' +
      '<details><summary class="btn btn-outline btn-sm" style="display:inline-block;">Reveal guidance</summary><p class="small mt-8">' + escapeHtml(l.guidance) + '</p>' + (l.designReviewFlag ? '<span class="pill pill-orange">Design review flagged</span>' : '') + '</details></div>';
  }).join('');
  return (
    '<a class="tiny muted" href="#/practice" style="text-decoration:none;">← Back to Practice Center</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">HVAC Practice Center</span><h1>Zone Planning Lab</h1><p class="mb-0">Estimate preliminary zones from sample floor plans — conversation examples, not final engineering.</p></div></div>' +
    '<div class="diagram-frame">' + DIAGRAMS['hv-diagram-zoning']() + '<p class="tiny muted text-center mt-8 mb-0">Same rough square footage, very different zoning.</p></div>' +
    layoutsHtml +
    '<h3 class="mt-24">Check your understanding</h3>' +
    ZONE_LAB_QUESTIONS.map(function (q, i) { return renderInlineQuizCard('zone', i, q); }).join('') +
    '<div class="card mt-16 text-center"><button class="btn btn-primary" onclick="completeZoneLab()">Mark Lab Complete</button></div>'
  );
}
function completeZoneLab() {
  NexisState.markLabComplete('hvac', 'zone-lab');
  NexisState.awardBadge('spec-comfort-zoning');
  alert('Comfort Zoning badge earned!');
  navigate('practice');
}

// ---------------- Solar Objection Simulator ----------------
var OBJ_SIM_INDEX = 0;
function renderObjectionSimPage() {
  OBJ_SIM_INDEX = OBJ_SIM_INDEX || 0;
  var sc = SOLAR_OBJECTION_SCENARIOS[OBJ_SIM_INDEX];
  var progress = Math.round(((OBJ_SIM_INDEX) / SOLAR_OBJECTION_SCENARIOS.length) * 100);
  return (
    '<a class="tiny muted" href="#/practice" style="text-decoration:none;">← Back to Practice Center</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Solar Objection Simulator · LAER Framework</span><h1>Scenario ' + (OBJ_SIM_INDEX + 1) + ' of ' + SOLAR_OBJECTION_SCENARIOS.length + '</h1></div></div>' +
    '<div class="progress-track"><div class="progress-fill" style="width:' + progress + '%;"></div></div>' +
    '<div class="card mt-16"><span class="pill pill-blue">Homeowner says</span><h2 class="mt-8">“' + escapeHtml(sc.objection) + '”</h2>' +
      '<p class="small">Choose the response that best follows the LAER framework (Listen, Acknowledge, Explore, Respond).</p>' +
      '<div id="obj-options">' + sc.options.map(function (o, i) {
        return '<div class="quiz-option" onclick="answerObjection(' + i + ')" id="obj-opt-' + i + '"><span class="quiz-letter">' + String.fromCharCode(65 + i) + '</span><span>' + escapeHtml(o.text) + '</span></div>';
      }).join('') + '</div>' +
      '<div id="obj-feedback" style="display:none;" class="mt-16">' +
        '<div class="callout tip"><h4>Best Response</h4><p class="mb-0">' + escapeHtml(sc.bestResponse) + '</p></div>' +
        '<div class="callout say-it mt-16"><h4>Why It Works</h4><p class="mb-0">' + escapeHtml(sc.whyItWorks) + '</p></div>' +
        '<div class="callout mt-16"><h4>Follow-Up Question</h4><p class="mb-0">' + escapeHtml(sc.followUp) + '</p></div>' +
        '<button class="btn btn-primary mt-16" onclick="nextObjection()">' + (OBJ_SIM_INDEX < SOLAR_OBJECTION_SCENARIOS.length - 1 ? 'Next Scenario →' : 'Finish') + '</button>' +
      '</div>' +
    '</div>'
  );
}
function answerObjection(i) {
  var sc = SOLAR_OBJECTION_SCENARIOS[OBJ_SIM_INDEX];
  sc.options.forEach(function (o, idx) {
    var el = qs('#obj-opt-' + idx);
    if (o.correct) el.classList.add('correct'); else if (idx === i) el.classList.add('incorrect');
  });
  qs('#obj-feedback').style.display = 'block';
}
function nextObjection() {
  if (OBJ_SIM_INDEX < SOLAR_OBJECTION_SCENARIOS.length - 1) {
    OBJ_SIM_INDEX++;
    renderShell('practice', renderObjectionSimPage());
  } else {
    NexisState.markLabComplete('solar', 'objection-sim');
    NexisState.awardBadge('spec-solar-objections');
    OBJ_SIM_INDEX = 0;
    alert('Solar Objection Specialist badge earned!');
    navigate('practice');
  }
}

// ---------------- HVAC Roleplay Center ----------------
function renderHvacRoleplayPage() {
  var completed = window._roleplayCompleted || {};
  var allDone = HVAC_ROLEPLAY_SCENARIOS.every(function (s) { return completed[s.id]; });
  return (
    '<a class="tiny muted" href="#/practice" style="text-decoration:none;">← Back to Practice Center</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">HVAC Roleplay Center</span><h1>6 scored scenarios</h1></div></div>' +
    HVAC_ROLEPLAY_SCENARIOS.map(function (s) {
      return '<div class="card mt-16"><div class="flex-between"><h3 class="mb-0">' + escapeHtml(s.title) + '</h3>' + (completed[s.id] ? '<span class="pill pill-green">Reviewed</span>' : '') + '</div>' +
        '<p class="small"><strong>Setup:</strong> ' + escapeHtml(s.setup) + '</p>' +
        '<p class="small"><strong>Your task:</strong> ' + escapeHtml(s.task) + '</p>' +
        '<details onclick="markRoleplayReviewed(\'' + s.id + '\')"><summary class="btn btn-outline btn-sm" style="display:inline-block;">Reveal model approach</summary>' +
        '<p class="small mt-8">' + escapeHtml(s.modelApproach) + '</p></details></div>';
    }).join('') +
    '<div class="card mt-16 text-center"><button class="btn btn-primary" onclick="completeHvacRoleplay()">Mark Roleplay Center Complete</button></div>'
  );
}
function markRoleplayReviewed(id) { window._roleplayCompleted = window._roleplayCompleted || {}; window._roleplayCompleted[id] = true; }
function completeHvacRoleplay() {
  NexisState.markLabComplete('hvac', 'hvac-roleplay');
  NexisState.awardBadge('spec-hvac-objections');
  alert('HVAC Objection Specialist badge earned!');
  navigate('practice');
}

// ---------------- Mass Save Programs (admin-editable DB) ----------------
var MS_EDIT_ID = null;
function getMassSavePrograms() {
  var st = NexisState.get();
  if (!st.massSavePrograms) { st.massSavePrograms = defaultMassSavePrograms(); NexisState.persist(); }
  return st.massSavePrograms;
}
var MS_FIELDS = [
  ['programName', 'Program Name'], ['programType', 'Program Type'], ['currentIncentive', 'Current Incentive'],
  ['maximumIncentive', 'Maximum Incentive'], ['eligibilityRequirements', 'Eligibility Requirements'],
  ['utilityRequirements', 'Utility Requirements'], ['weatherizationRequirements', 'Weatherization Requirements'],
  ['effectiveDate', 'Effective Date'], ['expirationDate', 'Expiration Date'], ['lastVerified', 'Last Verified'],
  ['source', 'Source'], ['reviewedBy', 'Reviewed By']
];
function statusPill(status) {
  var map = { active: 'pill-green', review_needed: 'pill-orange', expired: 'pill-gray' };
  var label = { active: 'Active', review_needed: 'Review Needed', expired: 'Expired' };
  return '<span class="pill ' + (map[status] || 'pill-gray') + '">' + (label[status] || status) + '</span>';
}
function renderMassSaveProgramsPage() {
  var isAdmin = NexisState.get().user.role === 'admin';
  var programs = getMassSavePrograms();
  return (
    '<a class="tiny muted" href="#/practice" style="text-decoration:none;">← Back to Practice Center</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Program Database</span><h1>Mass Save Programs</h1></div></div>' +
    '<div class="callout compliance"><h4>Program information must be verified before final pricing.</h4><p class="mb-0">Reps present these programs conceptually and verify current figures per project. ' + (isAdmin ? 'As an admin, you can edit records below.' : 'Only admins can edit this database.') + '</p></div>' +
    programs.map(function (p) {
      var editing = MS_EDIT_ID === p.id;
      if (editing) return renderMsEditRow(p);
      return '<div class="card mt-16"><div class="flex-between"><h3 class="mb-0">' + escapeHtml(p.programName) + '</h3>' + statusPill(p.status) + '</div>' +
        '<div class="grid grid-2 mt-8 small">' +
          '<div><strong>Type:</strong> ' + escapeHtml(p.programType) + '</div>' +
          '<div><strong>Current incentive:</strong> ' + escapeHtml(p.currentIncentive) + '</div>' +
          '<div><strong>Maximum incentive:</strong> ' + escapeHtml(p.maximumIncentive) + '</div>' +
          '<div><strong>Effective → Expiration:</strong> ' + escapeHtml(p.effectiveDate) + ' → ' + (p.expirationDate || 'ongoing') + '</div>' +
          '<div><strong>Eligibility:</strong> ' + escapeHtml(p.eligibilityRequirements) + '</div>' +
          '<div><strong>Utility requirements:</strong> ' + escapeHtml(p.utilityRequirements) + '</div>' +
          '<div><strong>Weatherization:</strong> ' + escapeHtml(p.weatherizationRequirements) + '</div>' +
          '<div><strong>Last verified:</strong> ' + escapeHtml(p.lastVerified) + ' by ' + escapeHtml(p.reviewedBy) + '</div>' +
        '</div><p class="tiny muted mt-8">Source: ' + escapeHtml(p.source) + '</p>' +
        (isAdmin ? '<button class="btn btn-outline btn-sm mt-8" onclick="editMsProgram(\'' + p.id + '\')">Edit</button>' : '') +
      '</div>';
    }).join('')
  );
}
function renderMsEditRow(p) {
  var fields = MS_FIELDS.map(function (f) {
    return '<div class="field"><label>' + f[1] + '</label><input type="text" id="msfield-' + f[0] + '" value="' + escapeHtml(p[f[0]]) + '"></div>';
  }).join('');
  return '<div class="card mt-16" style="border-color:var(--nexis-orange);">' + fields +
    '<div class="field"><label>Status</label><select id="msfield-status">' +
      ['active', 'review_needed', 'expired'].map(function (s) { return '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
    '</select></div>' +
    '<button class="btn btn-primary btn-sm" onclick="saveMsProgram(\'' + p.id + '\')">Save</button> ' +
    '<button class="btn btn-ghost btn-sm" onclick="MS_EDIT_ID=null;navigate(\'practice/mass-save-programs\')">Cancel</button>' +
  '</div>';
}
function editMsProgram(id) { MS_EDIT_ID = id; renderShell('practice', renderMassSaveProgramsPage()); }
function saveMsProgram(id) {
  var programs = getMassSavePrograms();
  var p = programs.find(function (x) { return x.id === id; });
  MS_FIELDS.forEach(function (f) { p[f[0]] = qs('#msfield-' + f[0]).value; });
  p.status = qs('#msfield-status').value;
  NexisState.persist();
  MS_EDIT_ID = null;
  renderShell('practice', renderMassSaveProgramsPage());
}
