/* ============================================================
   Nexis Onboarding — the rep-facing onboarding wizard and the
   Admin "Sales Rep Onboarding" pipeline dashboard.

   Pipeline: Offer Accepted -> Documents Complete -> Compliance
   Approved -> Accounts Created -> Training Complete -> Ready to Sell.

   This is an onboarding/compliance ASSISTANT, not a lawyer,
   accountant, or immigration adviser, and it never decides a rep's
   W-2/1099 classification -- that field lives in onboarding_admin,
   which RLS makes staff-write-only (see supabase/schema.sql). SSNs,
   bank/routing numbers, and ID document contents are never collected
   here; the document checklist tracks only a type + status.
   ============================================================ */

var ONB_I18N = {
  en: {
    welcomeEyebrow: 'Nexis Power Onboarding',
    welcomeTitle: 'Welcome to Nexis Power',
    welcomeBody: 'I’ll guide you through your onboarding, help you complete the required documents, and get you ready to sell. Most steps can be completed right here.',
    progressLabel: 'Your onboarding progress',
    stepPersonal: 'Personal Information',
    stepClassification: 'Employment Classification',
    stepDocuments: 'Documents & Agreements',
    stepEmail: 'Company Email',
    stepCrm: 'HubSpot CRM',
    stepTraining: 'Compliance Training',
    stepFinal: 'Final Approval',
    markSubmitted: 'Mark as Submitted',
    askPlaceholder: 'Ask about onboarding, compliance, or company policy…',
    askBtn: 'Ask',
    readyBanner: 'READY TO SELL — APPROVED',
    waitingClassification: 'Waiting on HR to confirm your employment classification (W-2 vs. 1099). A Classification Review task has already been opened for HR — no action needed from you right now. I never decide this myself, and you’re never asked to choose it.'
  },
  es: {
    welcomeEyebrow: 'Incorporación de Nexis Power',
    welcomeTitle: 'Bienvenido a Nexis Power',
    welcomeBody: 'Te guiaré durante tu incorporación, te ayudaré a completar los documentos requeridos y te prepararé para vender. La mayoría de los pasos se pueden completar aquí mismo.',
    progressLabel: 'Tu progreso de incorporación',
    stepPersonal: 'Información Personal',
    stepClassification: 'Clasificación Laboral',
    stepDocuments: 'Documentos y Acuerdos',
    stepEmail: 'Correo de la Empresa',
    stepCrm: 'CRM de HubSpot',
    stepTraining: 'Capacitación de Cumplimiento',
    stepFinal: 'Aprobación Final',
    markSubmitted: 'Marcar como Enviado',
    askPlaceholder: 'Pregunta sobre incorporación, cumplimiento o políticas de la empresa…',
    askBtn: 'Preguntar',
    readyBanner: 'LISTO PARA VENDER — APROBADO',
    waitingClassification: 'Esperando que Recursos Humanos confirme tu clasificación laboral (W-2 o 1099). Ya se abrió una tarea de Revisión de Clasificación para RR.HH. — no necesitas hacer nada por ahora. Yo nunca decido esto, y a ti tampoco se te pide elegirlo.'
  }
};
function onbT(key) {
  var dict = ONB_I18N[window._onbLang || 'en'] || ONB_I18N.en;
  return dict[key] || ONB_I18N.en[key] || key;
}
function onbSetLang(lang) {
  window._onbLang = lang;
  var user = NexisState.get().user;
  if (window.NEXIS_BACKEND_READY && user) dbUpdateOnboardingProfile(user.id, { language: lang }).catch(function () {});
  if (ONB_MY_CACHE && ONB_MY_CACHE.profile) ONB_MY_CACHE.profile.language = lang;
  renderShell('onboarding', renderOnboardingPage());
}

// ---------------- Rep: load my own onboarding record ----------------
var ONB_MY_CACHE = null; // { profile, admin, docs }
function loadMyOnboarding(onReadyRerender) {
  if (!window.NEXIS_BACKEND_READY) return null;
  if (ONB_MY_CACHE) return ONB_MY_CACHE;
  var userId = NexisState.get().user.id;
  if (!window._onbMyLoading) {
    window._onbMyLoading = true;
    Promise.all([
      dbFetchOnboardingProfile(userId),
      dbFetchOnboardingAdmin(userId),
      dbListOnboardingDocuments(userId)
    ]).then(function (r) {
      ONB_MY_CACHE = { profile: r[0].data || {}, admin: r[1].data || {}, docs: r[2].data || [] };
      window._onbLang = ONB_MY_CACHE.profile.language || 'en';
      window._onbMyLoading = false;
      if (onReadyRerender) onReadyRerender();
    }).catch(function (e) {
      console.error('Loading onboarding failed', e);
      ONB_MY_CACHE = { profile: {}, admin: {}, docs: [] };
      window._onbMyLoading = false;
      if (onReadyRerender) onReadyRerender();
    });
  }
  return null;
}

function onboardingTrainingComplete(track) {
  if (!track) return false;
  if (track === 'solar') return NexisState.hasPassedExam('solar');
  if (track === 'hvac') return NexisState.hasPassedExam('hvac');
  if (track === 'both') return NexisState.hasPassedExam('solar') && NexisState.hasPassedExam('hvac');
  return false;
}
function onboardingSteps(my) {
  var profile = my.profile || {}, admin = my.admin || {};
  var required = onboardingDocsFor(admin.classification);
  var docsDone = !!required.length && required.every(function (d) {
    var row = my.docs.filter(function (x) { return x.doc_key === d.key; })[0];
    return row && (row.status === 'received' || row.status === 'verified');
  });
  return [
    { key: 'personal', label: onbT('stepPersonal'), done: !!profile.intake_submitted_at },
    { key: 'classification', label: onbT('stepClassification'), done: !!admin.classification && admin.classification !== 'not_assigned' },
    { key: 'documents', label: onbT('stepDocuments'), done: docsDone },
    { key: 'email', label: onbT('stepEmail'), done: admin.email_status === 'active' },
    { key: 'crm', label: onbT('stepCrm'), done: admin.crm_status === 'active' },
    { key: 'training', label: onbT('stepTraining'), done: onboardingTrainingComplete(profile.track) },
    { key: 'final', label: onbT('stepFinal'), done: !!admin.ready_to_sell }
  ];
}

// ---------------- Rep-facing onboarding wizard ----------------
function renderOnboardingPage() {
  if (!window.NEXIS_BACKEND_READY) {
    return '<div class="section-head"><div><span class="eyebrow">Onboarding</span><h1>Nexis Power Onboarding</h1></div></div>' +
      '<div class="callout tip"><h4>Connect Supabase to enable onboarding</h4><p class="mb-0">Once js/config.js has your project URL and anon key, this becomes a real onboarding pipeline with HR-controlled classification, a document checklist, and a Ready-to-Sell gate.</p></div>';
  }
  var my = loadMyOnboarding(router);
  if (!my) return loadingCard('Loading your onboarding…');
  window._onbLang = window._onbLang || my.profile.language || 'en';

  var user = NexisState.get().user;
  var firstName = (user.name || '').split(' ')[0] || 'there';
  var steps = onboardingSteps(my);
  var doneCount = steps.filter(function (s) { return s.done; }).length;
  var pct = Math.round((doneCount / steps.length) * 100);
  var admin = my.admin || {};

  setTimeout(bindOnbPersonalForm, 0);

  return (
    (admin.ready_to_sell ? renderOnboardingReadyBanner(firstName) : (onbLangToggleHtml() + onbWelcomeHero(firstName))) +
    onbProgressBarHtml(steps, pct) +
    onbPersonalInfoCard(my) +
    onbClassificationCard(my) +
    onbDocumentsCard(my) +
    onbStatusCard(my) +
    onbTrainingCard(my) +
    onbFaqCard()
  );
}

function onbLangToggleHtml() {
  var lang = window._onbLang || 'en';
  return '<div class="flex" style="justify-content:flex-end;gap:8px;">' +
    '<button class="btn btn-sm ' + (lang === 'en' ? 'btn-dark' : 'btn-outline') + '" onclick="onbSetLang(\'en\')">English 🇺🇸</button>' +
    '<button class="btn btn-sm ' + (lang === 'es' ? 'btn-dark' : 'btn-outline') + '" onclick="onbSetLang(\'es\')">Español 🇪🇸</button>' +
  '</div>';
}
function onbWelcomeHero(firstName) {
  return '<div class="hero-dark mt-8"><span class="eyebrow" style="color:#FFCB70;">' + escapeHtml(onbT('welcomeEyebrow')) + '</span>' +
    '<h1 style="color:#fff;">' + escapeHtml(onbT('welcomeTitle')) + ', ' + escapeHtml(firstName) + '!</h1>' +
    '<p style="max-width:560px;">' + escapeHtml(onbT('welcomeBody')) + '</p></div>';
}
function renderOnboardingReadyBanner(firstName) {
  return '<div class="hero-dark mt-8" style="text-align:center;"><span class="eyebrow" style="color:#FFCB70;">' + escapeHtml(onbT('welcomeEyebrow')) + '</span>' +
    '<h1 style="color:#fff;">🎉 Congratulations, ' + escapeHtml(firstName) + '!</h1>' +
    '<p style="max-width:560px;margin:0 auto;">Your Nexis Power onboarding is complete. Welcome to Nexis Power!</p>' +
    '<div class="pill pill-green mt-16" style="font-size:.9rem;padding:10px 20px;">🟢 ' + escapeHtml(onbT('readyBanner')) + '</div></div>';
}
function onbProgressBarHtml(steps, pct) {
  return '<div class="card mt-16"><div class="flex-between"><h3 class="mb-0">' + escapeHtml(onbT('progressLabel')) + '</h3><span class="pill pill-orange">' + pct + '%</span></div>' +
    '<div class="progress-track mt-8"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' +
    '<div class="grid grid-2 mt-16">' + steps.map(function (s) {
      return '<div class="small">' + (s.done ? '✅' : '⬜') + ' ' + escapeHtml(s.label) + '</div>';
    }).join('') + '</div></div>';
}

function onbPersonalInfoCard(my) {
  var p = my.profile || {};
  function v(x) { return escapeHtml(x == null ? '' : x); }
  return '<div class="card mt-16"><h3>' + escapeHtml(onbT('stepPersonal')) + '</h3>' +
    '<form id="onb-personal-form"><div class="grid grid-2">' +
      '<div class="field"><label>Legal First Name</label><input id="onb-first" required value="' + v(p.legal_first_name) + '"></div>' +
      '<div class="field"><label>Middle Name / Initial</label><input id="onb-middle" value="' + v(p.middle_name) + '"></div>' +
      '<div class="field"><label>Legal Last Name</label><input id="onb-last" required value="' + v(p.legal_last_name) + '"></div>' +
      '<div class="field"><label>Preferred Name</label><input id="onb-preferred" value="' + v(p.preferred_name) + '"></div>' +
      '<div class="field"><label>Personal Email</label><input type="email" id="onb-pemail" required value="' + v(p.personal_email) + '"></div>' +
      '<div class="field"><label>Mobile Phone</label><input id="onb-phone" required value="' + v(p.mobile_phone) + '"></div>' +
      '<div class="field"><label>Home Address</label><input id="onb-address" value="' + v(p.home_address) + '"></div>' +
      '<div class="field"><label>City</label><input id="onb-city" value="' + v(p.city) + '"></div>' +
      '<div class="field"><label>State</label><input id="onb-state" value="' + v(p.state || 'MA') + '"></div>' +
      '<div class="field"><label>ZIP Code</label><input id="onb-zip" value="' + v(p.zip) + '"></div>' +
      '<div class="field"><label>Start Date</label><input type="date" id="onb-start" value="' + v(p.start_date) + '"></div>' +
      '<div class="field"><label>Position</label><input id="onb-position" value="' + v(p.position || 'Sales Representative') + '"></div>' +
      '<div class="field"><label>Sales Territory</label><input id="onb-territory" value="' + v(p.territory) + '"></div>' +
      '<div class="field"><label>Track</label><select id="onb-track">' +
        '<option value="">Select…</option>' +
        '<option value="solar"' + (p.track === 'solar' ? ' selected' : '') + '>Solar</option>' +
        '<option value="hvac"' + (p.track === 'hvac' ? ' selected' : '') + '>HVAC</option>' +
        '<option value="both"' + (p.track === 'both' ? ' selected' : '') + '>Solar + HVAC</option>' +
      '</select></div>' +
      '<div class="field"><label>Emergency Contact Name</label><input id="onb-ec-name" value="' + v(p.emergency_contact_name) + '"></div>' +
      '<div class="field"><label>Emergency Contact Phone</label><input id="onb-ec-phone" value="' + v(p.emergency_contact_phone) + '"></div>' +
    '</div><button type="submit" class="btn btn-primary mt-8">' + (p.intake_submitted_at ? 'Update Information' : 'Submit Information') + '</button>' +
    (p.intake_submitted_at ? '<span class="tiny muted mt-8" style="margin-left:10px;">Last submitted ' + fmtDate(p.intake_submitted_at) + '</span>' : '') +
    '</form></div>';
}
function bindOnbPersonalForm() {
  var form = qs('#onb-personal-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var user = NexisState.get().user;
    var patch = {
      legal_first_name: qs('#onb-first').value.trim(),
      middle_name: qs('#onb-middle').value.trim(),
      legal_last_name: qs('#onb-last').value.trim(),
      preferred_name: qs('#onb-preferred').value.trim(),
      personal_email: qs('#onb-pemail').value.trim(),
      mobile_phone: qs('#onb-phone').value.trim(),
      home_address: qs('#onb-address').value.trim(),
      city: qs('#onb-city').value.trim(),
      state: qs('#onb-state').value.trim(),
      zip: qs('#onb-zip').value.trim(),
      start_date: qs('#onb-start').value || null,
      position: qs('#onb-position').value.trim(),
      territory: qs('#onb-territory').value.trim(),
      track: qs('#onb-track').value || null,
      emergency_contact_name: qs('#onb-ec-name').value.trim(),
      emergency_contact_phone: qs('#onb-ec-phone').value.trim(),
      intake_submitted_at: new Date().toISOString()
    };
    var submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    dbUpdateOnboardingProfile(user.id, patch).then(function (res) {
      submitBtn.disabled = false;
      if (res.error) { alert('Could not save: ' + res.error.message); return; }
      Object.assign(ONB_MY_CACHE.profile, patch);
      dbLogOnboardingAudit(user.id, 'Personal information submitted', user.id, 'COMPLETE').catch(function () {});
      router();
    });
  });
}

function onbClassificationCard(my) {
  var admin = my.admin || {};
  var cls = admin.classification || 'not_assigned';
  if (cls === 'not_assigned') {
    onbMaybeOpenClassificationTask();
    return '<div class="card mt-16"><h3>' + escapeHtml(onbT('stepClassification')) + '</h3>' +
      '<div class="callout compliance"><p class="mb-0">' + escapeHtml(onbT('waitingClassification')) + '</p></div></div>';
  }
  var label = cls === 'w2_employee' ? 'W-2 Employee' : 'Independent Contractor (1099)';
  return '<div class="card mt-16"><h3>' + escapeHtml(onbT('stepClassification')) + '</h3><span class="pill pill-green">' + escapeHtml(label) + '</span></div>';
}
function onbMaybeOpenClassificationTask() {
  if (window._onbClassTaskFired) return;
  window._onbClassTaskFired = true;
  var user = NexisState.get().user;
  dbOpenOnboardingTask(
    user.id, 'classification_review', 'Employment Classification Review Required — ' + user.name,
    'Representative has entered onboarding and is waiting on an approved W-2/1099 classification before tax and document workflows can proceed. This must be set by an authorized administrator, never inferred automatically.',
    'urgent', user.id
  ).then(function (res) {
    if (!res.error) dbLogOnboardingAudit(user.id, 'Classification review task opened', user.id, 'OPEN').catch(function () {});
  }).catch(function () {});
}

function onbDocumentsCard(my) {
  var admin = my.admin || {};
  if (!admin.classification || admin.classification === 'not_assigned') return '';
  var docs = onboardingDocsFor(admin.classification);
  var byCat = {};
  docs.forEach(function (d) { (byCat[d.category] = byCat[d.category] || []).push(d); });
  var rowsHtml = Object.keys(byCat).map(function (cat) {
    return '<h4 class="mt-16">' + escapeHtml(cat) + '</h4>' + byCat[cat].map(function (d) {
      var row = my.docs.filter(function (x) { return x.doc_key === d.key; })[0];
      var status = row ? row.status : 'missing';
      var pill = status === 'verified' ? 'pill-green' : status === 'rejected' ? 'pill-gray' : 'pill-orange';
      return '<div class="flex-between small" style="padding:8px 0;border-bottom:1px solid var(--border);">' +
        '<span>' + escapeHtml(d.label) + '</span>' +
        (status === 'missing' || status === 'rejected'
          ? '<button class="btn btn-outline btn-sm" onclick="onbMarkDocSubmitted(\'' + d.key + '\')">' + escapeHtml(onbT('markSubmitted')) + '</button>'
          : '<span class="pill ' + pill + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>') +
      '</div>';
    }).join('');
  }).join('');
  return '<div class="card mt-16"><h3>' + escapeHtml(onbT('stepDocuments')) + '</h3>' +
    '<div class="callout compliance"><p class="mb-0">Your Social Security number, bank/routing numbers, and copies of ID documents are never collected here. Those go directly through the secure payroll/QuickBooks setup process with HR. "Mark as Submitted" only confirms you’ve sent the document through that secure channel.</p></div>' +
    rowsHtml + '</div>';
}
function onbMarkDocSubmitted(docKey) {
  var user = NexisState.get().user;
  var existing = ONB_MY_CACHE.docs.filter(function (x) { return x.doc_key === docKey; })[0];
  if (existing) { existing.status = 'received'; existing.received_at = nowISO(); }
  else { ONB_MY_CACHE.docs.push({ doc_key: docKey, status: 'received', received_at: nowISO() }); }
  dbMarkOnboardingDocSubmitted(user.id, docKey).then(function (res) {
    if (!res.error) dbLogOnboardingAudit(user.id, 'Document marked submitted: ' + docKey, user.id, 'RECEIVED').catch(function () {});
  }).catch(function () {});
  router();
}

function onbStatusCard(my) {
  var admin = my.admin || {};
  function pill(status) {
    status = status || 'not_created';
    var cls = status === 'active' ? 'pill-green' : status === 'pending' ? 'pill-orange' : 'pill-gray';
    return '<span class="pill ' + cls + '">' + status.replace(/_/g, ' ') + '</span>';
  }
  return '<div class="card mt-16"><h3>Accounts &amp; Systems</h3><div class="grid grid-3">' +
    '<div class="flex-between small"><span>' + escapeHtml(onbT('stepEmail')) + '</span>' + pill(admin.email_status) + '</div>' +
    '<div class="flex-between small"><span>' + escapeHtml(onbT('stepCrm')) + '</span>' + pill(admin.crm_status) + '</div>' +
    '<div class="flex-between small"><span>QuickBooks</span>' + pill(admin.quickbooks_status) + '</div>' +
  '</div><p class="tiny muted mt-8 mb-0">Provisioned by an administrator once your documents are approved.</p></div>';
}

function onbTrainingCard(my) {
  var profile = my.profile || {};
  var track = profile.track;
  if (!track) return '<div class="card mt-16"><h3>' + escapeHtml(onbT('stepTraining')) + '</h3><p class="small muted mb-0">Choose your track in Personal Information above to see required certifications here.</p></div>';
  var courses = track === 'both' ? [SOLAR_COURSE, HVAC_COURSE] : track === 'solar' ? [SOLAR_COURSE] : [HVAC_COURSE];
  return '<div class="card mt-16"><h3>' + escapeHtml(onbT('stepTraining')) + '</h3>' + courses.map(function (c) {
    var status = NexisState.certStatus(c);
    return '<div class="flex-between small" style="padding:6px 0;"><span>' + c.icon + ' ' + escapeHtml(c.title) + '</span><span class="pill ' + CERT_STATUS_PILL[status] + '">' + CERT_STATUS_LABEL[status] + '</span></div>';
  }).join('') + '<button class="btn btn-dark btn-sm mt-8" onclick="navigate(\'certifications\')">Go to Certifications →</button></div>';
}

function onbFaqCard() {
  window._onbFaqHistory = window._onbFaqHistory || [];
  return '<div class="card mt-16"><h3>Ask Nexis Onboarding</h3>' +
    '<p class="small muted">Company procedures and general compliance information only — not individualized legal, tax, or immigration advice.</p>' +
    '<div class="flex gap-10 mt-8"><input type="text" id="onb-faq-input" placeholder="' + escapeHtml(onbT('askPlaceholder')) + '" style="flex:1;padding:12px 14px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;" onkeydown="if(event.key===\'Enter\')onbAskFaq();">' +
    '<button class="btn btn-primary" onclick="onbAskFaq()">' + escapeHtml(onbT('askBtn')) + '</button></div>' +
    '<div class="stack mt-16">' + window._onbFaqHistory.map(onbRenderFaqTurn).join('') + '</div>' +
  '</div>';
}
function onbAskFaq() {
  var input = qs('#onb-faq-input');
  var query = input.value.trim();
  if (!query) return;
  input.value = '';
  var results = searchOnboardingFaq(query);
  var turn = { query: query, results: results, escalated: false };
  if (!results.length) {
    turn.escalated = true;
    var user = NexisState.get().user;
    if (window.NEXIS_BACKEND_READY) {
      dbOpenOnboardingTask(
        user.id, 'legal_compliance_review', 'Legal/Compliance Review — ' + user.name,
        'Question asked during onboarding with no matching approved content: "' + query + '"', 'normal', user.id
      ).then(function (res) {
        if (!res.error) dbLogOnboardingAudit(user.id, 'Legal/compliance review task opened', user.id, 'OPEN').catch(function () {});
      }).catch(function () {});
    }
  }
  window._onbFaqHistory.unshift(turn);
  router();
}
function onbRenderFaqTurn(turn) {
  return '<div class="card card-flat" style="border:1px solid var(--border);">' +
    '<p style="font-weight:700;">You asked: “' + escapeHtml(turn.query) + '”</p>' +
    turn.results.map(function (r) { return '<div class="callout tip mt-8"><p class="mb-0">' + escapeHtml(r.a) + '</p></div>'; }).join('') +
    (turn.escalated ? '<div class="callout compliance mt-8"><p class="mb-0">I don’t have approved content that directly answers this. This has been sent to management/legal for review — I don’t guess on legal, tax, immigration, or compliance questions.</p></div>' : '') +
  '</div>';
}

// ================================================================
// Admin: Sales Rep Onboarding pipeline dashboard
// ================================================================
var ONB_ADMIN_CACHE = null; // { profiles, intake, admin, docs }
function loadAllOnboarding(onReadyRerender) {
  if (!window.NEXIS_BACKEND_READY) return null;
  if (ONB_ADMIN_CACHE) return ONB_ADMIN_CACHE;
  if (!window._onbAdminLoading) {
    window._onbAdminLoading = true;
    Promise.all([
      dbListAllOnboardingProfiles(),
      dbListOnboardingAdmin(),
      dbListAllOnboardingDocuments()
    ]).then(function (r) {
      ONB_ADMIN_CACHE = { intake: r[0].data || [], admin: r[1].data || [], docs: r[2].data || [] };
      window._onbAdminLoading = false;
      if (onReadyRerender) onReadyRerender();
    }).catch(function (e) {
      console.error('Loading onboarding admin data failed', e);
      ONB_ADMIN_CACHE = { intake: [], admin: [], docs: [] };
      window._onbAdminLoading = false;
      if (onReadyRerender) onReadyRerender();
    });
  }
  return null;
}
var ONB_TASKS_CACHE = null;
function loadOnboardingTasks(onReadyRerender) {
  if (!window.NEXIS_BACKEND_READY) return null;
  if (ONB_TASKS_CACHE) return ONB_TASKS_CACHE;
  if (!window._onbTasksLoading) {
    window._onbTasksLoading = true;
    dbListOpenOnboardingTasks().then(function (res) {
      ONB_TASKS_CACHE = res.data || [];
      window._onbTasksLoading = false;
      if (onReadyRerender) onReadyRerender();
    }).catch(function (e) { console.error('Loading onboarding tasks failed', e); ONB_TASKS_CACHE = []; window._onbTasksLoading = false; if (onReadyRerender) onReadyRerender(); });
  }
  return null;
}
var ONB_AUDIT_CACHE = null;
function loadOnboardingAudit(onReadyRerender) {
  if (!window.NEXIS_BACKEND_READY) return null;
  if (ONB_AUDIT_CACHE) return ONB_AUDIT_CACHE;
  if (!window._onbAuditLoading) {
    window._onbAuditLoading = true;
    dbListOnboardingAudit().then(function (res) {
      ONB_AUDIT_CACHE = res.data || [];
      window._onbAuditLoading = false;
      if (onReadyRerender) onReadyRerender();
    }).catch(function (e) { console.error('Loading onboarding audit failed', e); ONB_AUDIT_CACHE = []; window._onbAuditLoading = false; if (onReadyRerender) onReadyRerender(); });
  }
  return null;
}

function combinedOnboardingRows() {
  var team = getTeamData(router);
  var all = loadAllOnboarding(router);
  if (!team || !all) return null;
  var teamById = {}; team.forEach(function (m) { teamById[m.id] = m; });
  var intakeById = {}; all.intake.forEach(function (r) { intakeById[r.user_id] = r; });
  var adminById = {}; all.admin.forEach(function (r) { adminById[r.user_id] = r; });
  var docsByUser = {}; all.docs.forEach(function (r) { (docsByUser[r.user_id] = docsByUser[r.user_id] || []).push(r); });

  return team.filter(function (m) { return intakeById[m.id]; }).map(function (m) {
    var intake = intakeById[m.id] || {};
    var adminRow = adminById[m.id] || {};
    var docs = docsByUser[m.id] || [];
    var required = onboardingDocsFor(adminRow.classification);
    var got = required.filter(function (d) {
      var row = docs.filter(function (x) { return x.doc_key === d.key; })[0];
      return row && (row.status === 'received' || row.status === 'verified');
    });
    var docsPct = required.length ? Math.round((got.length / required.length) * 100) : 0;
    var missing = required.filter(function (d) {
      var row = docs.filter(function (x) { return x.doc_key === d.key; })[0];
      return !row || row.status === 'missing' || row.status === 'rejected';
    }).map(function (d) { return d.label; });
    var trainingPct = Math.round(((m.solarPct || 0) + (m.hvacPct || 0)) / 2);
    var readyEligible = !!adminRow.classification && adminRow.classification !== 'not_assigned' &&
      !!intake.intake_submitted_at && docsPct === 100 &&
      adminRow.email_status === 'active' && adminRow.crm_status === 'active';
    return { id: m.id, name: m.name, intake: intake, admin: adminRow, docsPct: docsPct, missing: missing, trainingPct: trainingPct, readyEligible: readyEligible };
  });
}

function renderAdminOnboardingPage() {
  if (!window.NEXIS_BACKEND_READY) {
    return '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Sales Rep Onboarding</h1></div></div>' +
      '<div class="callout tip"><h4>Connect Supabase to enable onboarding</h4><p class="mb-0">Once configured, this becomes the live onboarding pipeline dashboard for every invited Sales Representative.</p></div>';
  }
  var rows = combinedOnboardingRows();
  var tasks = loadOnboardingTasks(router);
  var audit = loadOnboardingAudit(router);
  if (!rows) return loadingCard('Loading onboarding pipeline…');

  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Sales Rep Onboarding</h1>' +
      '<p class="mb-0">Offer Accepted → Documents Complete → Compliance Approved → Accounts Created → Training Complete → Ready to Sell.</p></div></div>' +
    (rows.length ? onbAdminDashboardTable(rows) :
      '<div class="callout tip"><h4>No reps in onboarding</h4><p class="mb-0">Invite a new Sales Representative from Admin → Users to start their onboarding pipeline here.</p></div>') +
    '<div class="grid grid-2 mt-24">' +
      onbTaskInboxCard(tasks) +
      onbAuditCard(audit) +
    '</div>'
  );
}

// ---------------- Admin: full onboarding record for one rep ----------------
function renderOnboardingRepDetailPage(userId) {
  if (!window.NEXIS_BACKEND_READY) return '<p>Connect Supabase to view onboarding records.</p>';
  var rows = combinedOnboardingRows();
  var audit = loadOnboardingAudit(router);
  if (!rows || !audit) return loadingCard('Loading rep record…');
  var row = rows.filter(function (r) { return r.id === userId; })[0];
  if (!row) return '<a class="tiny muted" href="#/admin/onboarding" style="text-decoration:none;">← Back to Onboarding</a><p class="mt-16">Rep not found.</p>';

  var intake = row.intake, adminRow = row.admin;
  var required = onboardingDocsFor(adminRow.classification);
  var docs = (ONB_ADMIN_CACHE.docs || []).filter(function (r) { return r.user_id === userId; });
  var repAudit = audit.filter(function (a) { return a.user_id === userId; });

  function field(label, val) { return '<div class="small" style="padding:6px 0;border-bottom:1px solid var(--border);"><span class="muted">' + escapeHtml(label) + ':</span> ' + escapeHtml(val || '—') + '</div>'; }

  return (
    '<a class="tiny muted" href="#/admin/onboarding" style="text-decoration:none;">← Back to Onboarding Dashboard</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Onboarding Record</span><h1>' + escapeHtml(row.name) + '</h1></div>' +
      (adminRow.ready_to_sell ? '<span class="pill pill-green">🟢 Ready to Sell</span>' :
        '<button class="btn btn-sm ' + (row.readyEligible ? 'btn-primary' : 'btn-outline') + '" ' + (row.readyEligible ? '' : 'disabled title="All gates must pass first"') + ' onclick="onbApproveReadyToSell(\'' + userId + '\')">Approve Ready to Sell</button>') +
    '</div>' +
    '<div class="grid grid-2 mt-8">' +
      '<div class="card"><h3>Personal Information</h3>' +
        field('Legal Name', [intake.legal_first_name, intake.middle_name, intake.legal_last_name].filter(Boolean).join(' ')) +
        field('Preferred Name', intake.preferred_name) +
        field('Personal Email', intake.personal_email) +
        field('Mobile Phone', intake.mobile_phone) +
        field('Address', [intake.home_address, intake.city, intake.state, intake.zip].filter(Boolean).join(', ')) +
        field('Start Date', intake.start_date ? fmtDate(intake.start_date) : null) +
        field('Position', intake.position) +
        field('Territory', intake.territory) +
        field('Track', intake.track) +
        field('Emergency Contact', intake.emergency_contact_name ? intake.emergency_contact_name + (intake.emergency_contact_phone ? ' (' + intake.emergency_contact_phone + ')' : '') : null) +
        field('Preferred Language', intake.language === 'es' ? 'Español' : 'English') +
        field('Intake Submitted', intake.intake_submitted_at ? fmtDate(intake.intake_submitted_at) : 'Not yet submitted') +
      '</div>' +
      '<div class="card"><h3>Classification &amp; Pipeline</h3>' +
        '<div class="small muted mb-0" style="padding-bottom:6px;">Classification</div>' + onbClassificationSelect(row) +
        '<div class="mt-16">' +
          field('Email', (adminRow.email_status || 'not_created').replace(/_/g, ' ')) +
          field('CRM', (adminRow.crm_status || 'not_created').replace(/_/g, ' ')) +
          field('QuickBooks', (adminRow.quickbooks_status || 'not_created').replace(/_/g, ' ')) +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="card mt-16"><h3>Document &amp; Agreement Checklist</h3>' +
      (required.length ? onbDocAdminChecklist(userId, required, docs) : '<p class="small muted mb-0">Classification not yet assigned — no document checklist yet.</p>') +
    '</div>' +
    '<div class="card mt-16"><h3>Audit Trail</h3>' +
      (repAudit.length ? '<div class="stack">' + repAudit.map(function (a) {
        return '<div class="small" style="padding:6px 0;border-bottom:1px solid var(--border);"><span class="tiny muted">' + fmtDate(a.at) + '</span> — ' + escapeHtml(a.action) + (a.result ? ' <span class="pill pill-gray">' + escapeHtml(a.result) + '</span>' : '') + '</div>';
      }).join('') + '</div>' : '<p class="small muted mb-0">No entries yet for this rep in the loaded audit window.</p>') +
    '</div>'
  );
}
function onbDocAdminChecklist(userId, required, docs) {
  var byCat = {};
  required.forEach(function (d) { (byCat[d.category] = byCat[d.category] || []).push(d); });
  var opts = [['missing', 'Missing'], ['received', 'Received'], ['verified', 'Verified'], ['rejected', 'Rejected']];
  return Object.keys(byCat).map(function (cat) {
    return '<h4 class="mt-16">' + escapeHtml(cat) + '</h4>' + byCat[cat].map(function (d) {
      var row = docs.filter(function (x) { return x.doc_key === d.key; })[0] || { status: 'missing' };
      return '<div class="flex-between small" style="padding:8px 0;border-bottom:1px solid var(--border);">' +
        '<span>' + escapeHtml(d.label) + '</span>' +
        '<select onchange="onbAdminSetDocStatus(\'' + userId + '\', \'' + d.key + '\', this.value)">' +
          opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === row.status ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select>' +
      '</div>';
    }).join('');
  }).join('');
}
function onbAdminSetDocStatus(userId, docKey, status) {
  var me = NexisState.get().user;
  dbSetOnboardingDocStatus(userId, docKey, status, me.id, null).then(function (res) {
    if (res.error) { alert('Could not update: ' + res.error.message); return; }
    if (ONB_ADMIN_CACHE) {
      var row = ONB_ADMIN_CACHE.docs.filter(function (x) { return x.user_id === userId && x.doc_key === docKey; })[0];
      if (row) row.status = status; else ONB_ADMIN_CACHE.docs.push({ user_id: userId, doc_key: docKey, status: status });
    }
    dbLogOnboardingAudit(userId, 'Document ' + docKey + ' set to ' + status, me.id, status.toUpperCase()).catch(function () {});
    router();
  });
}

function onbClassificationSelect(row) {
  var c = row.admin.classification || 'not_assigned';
  var opts = [['not_assigned', 'Pending HR Review'], ['w2_employee', 'W-2 Employee'], ['1099_contractor', '1099 Contractor']];
  return '<select onchange="onbSetClassification(\'' + row.id + '\', this.value)">' +
    opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === c ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
  '</select>';
}
function onbStatusSelect(row, field) {
  var v = row.admin[field] || 'not_created';
  var opts = [['not_created', 'Not Created'], ['pending', 'Pending'], ['active', 'Active']];
  return '<select onchange="onbSetAdminField(\'' + row.id + '\', \'' + field + '\', this.value)">' +
    opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
  '</select>';
}
function onbAdminDashboardTable(rows) {
  return '<div class="card" style="overflow-x:auto;"><table class="lesson-table"><thead><tr>' +
    '<th>Rep</th><th>Start Date</th><th>Classification</th><th>Docs</th><th>Training</th><th>Email</th><th>CRM</th><th>QuickBooks</th><th>Ready to Sell</th>' +
    '</tr></thead><tbody>' + rows.map(onbAdminRowHtml).join('') + '</tbody></table></div>';
}
function onbAdminRowHtml(row) {
  var missingHtml = row.missing.length ? '<div class="tiny muted mt-8">Missing: ' + escapeHtml(row.missing.slice(0, 3).join(', ')) + (row.missing.length > 3 ? ' +' + (row.missing.length - 3) + ' more' : '') + '</div>' : '';
  return '<tr>' +
    '<td style="font-weight:700;cursor:pointer;" onclick="navigate(\'admin/onboarding/rep/' + row.id + '\')">' + escapeHtml(row.name) + ' →</td>' +
    '<td class="small">' + (row.intake.start_date ? fmtDate(row.intake.start_date) : '—') + '</td>' +
    '<td>' + onbClassificationSelect(row) + missingHtml + '</td>' +
    '<td><span class="pill ' + (row.docsPct === 100 ? 'pill-green' : row.docsPct > 0 ? 'pill-orange' : 'pill-gray') + '">' + row.docsPct + '%</span></td>' +
    '<td><span class="pill ' + (row.trainingPct >= 100 ? 'pill-green' : row.trainingPct > 0 ? 'pill-blue' : 'pill-gray') + '">' + row.trainingPct + '%</span></td>' +
    '<td>' + onbStatusSelect(row, 'email_status') + '</td>' +
    '<td>' + onbStatusSelect(row, 'crm_status') + '</td>' +
    '<td>' + onbStatusSelect(row, 'quickbooks_status') + '</td>' +
    '<td>' + (row.admin.ready_to_sell
      ? '<span class="pill pill-green">🟢 Ready</span>'
      : '<button class="btn btn-sm ' + (row.readyEligible ? 'btn-primary' : 'btn-outline') + '" ' + (row.readyEligible ? '' : 'disabled title="All gates must pass first"') + ' onclick="onbApproveReadyToSell(\'' + row.id + '\')">Approve</button>') +
    '</td>' +
  '</tr>';
}

function onbAutoResolveClassificationTasks(userId, resolverId) {
  if (!ONB_TASKS_CACHE) return;
  ONB_TASKS_CACHE.filter(function (t) { return t.user_id === userId && t.task_type === 'classification_review' && t.status === 'open'; })
    .forEach(function (t) { dbResolveOnboardingTask(t.id, resolverId).catch(function () {}); t.status = 'resolved'; });
  ONB_TASKS_CACHE = ONB_TASKS_CACHE.filter(function (t) { return t.status === 'open'; });
}
function onbSetClassification(userId, value) {
  var me = NexisState.get().user;
  dbUpdateOnboardingAdmin(userId, { classification: value }).then(function (res) {
    if (res.error) { alert('Could not update classification: ' + res.error.message); return; }
    if (ONB_ADMIN_CACHE) { var r = ONB_ADMIN_CACHE.admin.filter(function (x) { return x.user_id === userId; })[0]; if (r) r.classification = value; }
    dbLogOnboardingAudit(userId, 'Classification set to ' + value, me.id, 'UPDATED').catch(function () {});
    if (value !== 'not_assigned') onbAutoResolveClassificationTasks(userId, me.id);
    router();
  });
}
function onbSetAdminField(userId, field, value) {
  var me = NexisState.get().user;
  var patch = {}; patch[field] = value;
  dbUpdateOnboardingAdmin(userId, patch).then(function (res) {
    if (res.error) { alert('Could not update: ' + res.error.message); return; }
    if (ONB_ADMIN_CACHE) { var r = ONB_ADMIN_CACHE.admin.filter(function (x) { return x.user_id === userId; })[0]; if (r) r[field] = value; }
    dbLogOnboardingAudit(userId, field + ' set to ' + value, me.id, 'UPDATED').catch(function () {});
    router();
  });
}
function onbApproveReadyToSell(userId) {
  var me = NexisState.get().user;
  if (!confirm('Approve this representative as READY TO SELL? This is a final human approval and unlocks full production access.')) return;
  dbUpdateOnboardingAdmin(userId, { ready_to_sell: true, ready_to_sell_at: new Date().toISOString(), ready_to_sell_by: me.id }).then(function (res) {
    if (res.error) { alert('Could not approve: ' + res.error.message); return; }
    if (ONB_ADMIN_CACHE) { var r = ONB_ADMIN_CACHE.admin.filter(function (x) { return x.user_id === userId; })[0]; if (r) r.ready_to_sell = true; }
    dbLogOnboardingAudit(userId, 'Approved READY TO SELL', me.id, 'APPROVED').catch(function () {});
    router();
  });
}

function onbTaskInboxCard(tasks) {
  if (!tasks) return '<div class="card">' + loadingCard('Loading tasks…') + '</div>';
  return '<div class="card"><h3>HR / Compliance Task Queue</h3>' +
    (tasks.length ? tasks.map(function (t) {
      return '<div class="callout ' + (t.urgency === 'urgent' ? 'compliance' : 'tip') + ' mt-8"><div class="flex-between"><strong>' + escapeHtml(t.title) + '</strong>' +
        '<span class="pill ' + (t.urgency === 'urgent' ? 'pill-orange' : 'pill-blue') + '">' + escapeHtml(t.task_type.replace(/_/g, ' ')) + '</span></div>' +
        (t.detail ? '<p class="small mt-8 mb-0">' + escapeHtml(t.detail) + '</p>' : '') +
        '<div class="tag-row mt-8"><button class="btn btn-outline btn-sm" onclick="onbResolveTask(\'' + t.id + '\')">Mark Resolved</button></div></div>';
    }).join('') : '<p class="small muted mb-0">No open tasks.</p>') +
  '</div>';
}
function onbResolveTask(taskId) {
  var me = NexisState.get().user;
  dbResolveOnboardingTask(taskId, me.id).then(function (res) {
    if (res.error) { alert('Could not resolve: ' + res.error.message); return; }
    if (ONB_TASKS_CACHE) ONB_TASKS_CACHE = ONB_TASKS_CACHE.filter(function (t) { return t.id !== taskId; });
    router();
  });
}
function onbAuditCard(audit) {
  if (!audit) return '<div class="card">' + loadingCard('Loading audit trail…') + '</div>';
  return '<div class="card"><h3>Onboarding Audit Trail</h3>' +
    (audit.length ? '<div class="stack" style="max-height:360px;overflow-y:auto;">' + audit.slice(0, 30).map(function (a) {
      return '<div class="small" style="padding:6px 0;border-bottom:1px solid var(--border);"><span class="tiny muted">' + fmtDate(a.at) + '</span> — ' + escapeHtml(a.action) + (a.result ? ' <span class="pill pill-gray">' + escapeHtml(a.result) + '</span>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="small muted mb-0">No audit entries yet.</p>') +
  '</div>';
}
