/* ============================================================
   Manager Dashboard, Team Skill Matrix, and Admin pages
   (Course Manager, Question Bank, Certifications, Content Library,
   Users, Settings) — a working prototype of the CMS/reporting layer.
   ============================================================ */

// ---------------- Real team data (Supabase) with a lazy self-refreshing cache ----------------
// In real-backend mode, DEMO_TEAM is never used — this loads actual profiles +
// progress (scoped by RLS to "my team" for managers, "everyone" for admins)
// and reshapes each row into the exact same field names DEMO_TEAM uses, so
// every existing render function below works unchanged either way.
var TEAM_CACHE = null;
function getTeamData(onReadyRerender) {
  if (!window.NEXIS_BACKEND_READY) return DEMO_TEAM;
  if (TEAM_CACHE) return TEAM_CACHE;
  if (!window._teamLoading) {
    window._teamLoading = true;
    dbListTeamProfiles().then(function (res) {
      var profiles = (res.data || []).filter(function (p) { return p.id !== NexisState.get().user.id; });
      return Promise.all(profiles.map(function (p) { return dbFetchUserFullProgress(p.id).then(function (full) { return realMemberFromProfile(p, full); }); }));
    }).then(function (members) {
      TEAM_CACHE = members;
      window._teamLoading = false;
      if (onReadyRerender) onReadyRerender();
    }).catch(function (e) {
      console.error('Loading team data failed', e);
      TEAM_CACHE = [];
      window._teamLoading = false;
      if (onReadyRerender) onReadyRerender();
    });
  }
  return null;
}
function courseLessonPct(courseDef, lessonRows) {
  var total = 0, done = 0;
  courseDef.modules.forEach(function (m) {
    total += m.lessons.length;
    m.lessons.forEach(function (l) {
      if (lessonRows.some(function (r) { return r.course_id === courseDef.id && r.module_id === m.id && r.lesson_id === l.id; })) done++;
    });
  });
  return total ? Math.round((done / total) * 100) : 0;
}
function bestExamForCourse(examRows, courseId) {
  var rows = examRows.filter(function (r) { return r.course_id === courseId; });
  if (!rows.length) return null;
  return rows.reduce(function (best, r) { return (!best || r.score_pct > best.score_pct) ? r : best; }, null);
}
function realMemberFromProfile(profile, full) {
  var solarBest = bestExamForCourse(full.exams, 'solar');
  var hvacBest = bestExamForCourse(full.exams, 'hvac');
  var eaBest = bestExamForCourse(full.exams, 'energy-advisor');
  var eaPractical = full.practicals.filter(function (r) { return r.course_id === 'energy-advisor'; }).reduce(function (best, r) { return (!best || r.score_pct > best.score_pct) ? r : best; }, null);
  var solarCert = !!(solarBest && solarBest.passed);
  var hvacCert = !!(hvacBest && hvacBest.passed);
  var advisorStatus = 'locked';
  if (solarCert && hvacCert) {
    advisorStatus = (eaBest && eaBest.passed && (!ENERGY_ADVISOR_COURSE.practicalExam || (eaPractical && eaPractical.passed))) ? 'certified' : 'ready';
  }
  var checksAll = full.checks.map(function (c) { return c.score_pct; });
  var quizAvg = checksAll.length ? Math.round(checksAll.reduce(function (a, b) { return a + b; }, 0) / checksAll.length) : 0;
  var examScores = [solarBest, hvacBest, eaBest].filter(Boolean).map(function (e) { return e.score_pct; });
  var examAvg = examScores.length ? Math.round(examScores.reduce(function (a, b) { return a + b; }, 0) / examScores.length) : 0;
  var totalMinutes = full.lessons.reduce(function (s, r) { return s + (r.est_minutes || 6); }, 0);
  var lastTimes = full.lessons.map(function (r) { return r.completed_at; }).concat(full.exams.map(function (r) { return r.at; })).filter(Boolean).sort();
  var lastActivity = lastTimes.length ? lastTimes[lastTimes.length - 1].slice(0, 10) : (profile.created_at || '').slice(0, 10);
  var weakTopics = [];
  [solarBest, hvacBest, eaBest].forEach(function (best) {
    if (best && best.category_breakdown) {
      best.category_breakdown.filter(function (c) { return c.pct < 70; }).forEach(function (c) { if (weakTopics.indexOf(c.category) === -1) weakTopics.push(c.category); });
    }
  });
  var examsByCourse = { solar: [], hvac: [], 'energy-advisor': [] };
  full.exams.forEach(function (r) { examsByCourse[r.course_id] = examsByCourse[r.course_id] || []; examsByCourse[r.course_id].push({ scorePct: r.score_pct, passed: r.passed, at: r.at }); });
  return {
    id: profile.id, name: profile.name,
    role: profile.role !== 'rep' ? (profile.role === 'admin' ? 'Admin' : 'Manager') : (solarCert && hvacCert ? 'Solar + HVAC Rep' : (solarCert ? 'Solar Rep' : (hvacCert ? 'HVAC Rep' : 'Rep'))),
    solarPct: courseLessonPct(SOLAR_COURSE, full.lessons), hvacPct: courseLessonPct(HVAC_COURSE, full.lessons),
    solarCert: solarCert, hvacCert: hvacCert, advisorStatus: advisorStatus,
    quizAvg: quizAvg, examAvg: examAvg, trainingHours: Math.round((totalMinutes / 60) * 10) / 10,
    lastActivity: lastActivity, weakTopics: weakTopics,
    _lessons: full.lessons, _examsByCourse: examsByCourse
  };
}
function moduleListFor(m, courseDef, pct) {
  if (m._lessons) {
    return courseDef.modules.map(function (mod) {
      var doneIds = m._lessons.filter(function (r) { return r.course_id === courseDef.id && r.module_id === mod.id; }).map(function (r) { return r.lesson_id; });
      var lessonsDone = mod.lessons.filter(function (l) { return doneIds.indexOf(l.id) !== -1; }).length;
      return { number: mod.number, title: mod.title, lessonsDone: lessonsDone, lessonsTotal: mod.lessons.length, complete: lessonsDone >= mod.lessons.length && mod.lessons.length > 0 };
    });
  }
  return synthModuleProgress(m, courseDef, pct);
}
function examAttemptsFor(m, courseId) {
  if (m._examsByCourse) return m._examsByCourse[courseId] || [];
  return synthExamAttempts(m, courseId);
}

// ---------------- Manager Dashboard ----------------
function certCellForMember(m, track) {
  if (track === 'advisor') {
    var map = { certified: '✅', ready: 'READY', locked: 'LOCKED' };
    var cls = m.advisorStatus === 'certified' ? 'pill-green' : m.advisorStatus === 'ready' ? 'pill-orange' : 'pill-gray';
    return '<span class="pill ' + cls + '">' + (map[m.advisorStatus] || m.advisorStatus) + '</span>';
  }
  var done = track === 'solar' ? m.solarCert : m.hvacCert;
  var p = track === 'solar' ? m.solarPct : m.hvacPct;
  if (done) return '<span class="pill pill-green">✅ Certified</span>';
  return '<span class="pill pill-blue">' + p + '%</span>';
}
function loadingCard(label) { return '<div class="card text-center" style="padding:50px;"><p class="muted mb-0">' + escapeHtml(label || 'Loading…') + '</p></div>'; }
function renderManagerDashboardPage() {
  var team = getTeamData(function () { renderShell('manager', renderManagerDashboardPage()); });
  if (!team) return loadingCard('Loading your team…');
  if (!team.length) {
    return '<div class="section-head"><div><span class="eyebrow">Manager Dashboard</span><h1>Team Certification Status</h1></div></div>' +
      '<div class="callout tip"><h4>No reps yet</h4><p class="mb-0">' + (window.NEXIS_BACKEND_READY ? 'Invite your first rep from Admin → Users to see their training here.' : 'No demo team data available.') + '</p></div>';
  }
  var overallCompletion = Math.round(team.reduce(function (s, m) { return s + (m.solarPct + m.hvacPct) / 2; }, 0) / team.length);
  var quizAvg = Math.round(team.reduce(function (s, m) { return s + m.quizAvg; }, 0) / team.length);
  var examAvg = Math.round(team.reduce(function (s, m) { return s + m.examAvg; }, 0) / team.length);
  var hoursTotal = team.reduce(function (s, m) { return s + m.trainingHours; }, 0);
  var weakTopicCounts = {};
  team.forEach(function (m) { m.weakTopics.forEach(function (t) { weakTopicCounts[t] = (weakTopicCounts[t] || 0) + 1; }); });
  var weakest = Object.keys(weakTopicCounts).sort(function (a, b) { return weakTopicCounts[b] - weakTopicCounts[a]; }).slice(0, 5);

  return (
    '<div class="section-head"><div><span class="eyebrow">Manager Dashboard</span><h1>Team Certification Status</h1></div>' +
      '<button class="btn btn-outline btn-sm" onclick="navigate(\'manager/analytics\')">View Analytics →</button></div>' +
    '<div class="grid grid-4 mt-8">' +
      statTile('📈', overallCompletion + '%', 'Overall Completion') +
      statTile('📝', quizAvg + '%', 'Quiz Average') +
      statTile('🎓', examAvg + '%', 'Exam Scores Avg') +
      statTile('⏱️', hoursTotal + 'h', 'Training Hours') +
    '</div>' +
    '<div class="card mt-24" style="overflow-x:auto;">' +
      '<table class="lesson-table"><thead><tr><th>Rep</th><th>Solar</th><th>HVAC</th><th>Energy Advisor</th><th>Last Activity</th><th></th></tr></thead><tbody>' +
      team.map(function (m) {
        return '<tr style="cursor:pointer;" onclick="navigate(\'manager/rep/' + m.id + '\')"><td style="font-weight:700;">' + escapeHtml(m.name) + '<div class="tiny muted">' + escapeHtml(m.role) + '</div></td>' +
          '<td>' + certCellForMember(m, 'solar') + '</td>' +
          '<td>' + certCellForMember(m, 'hvac') + '</td>' +
          '<td>' + certCellForMember(m, 'advisor') + '</td>' +
          '<td class="small">' + fmtDate(m.lastActivity) + '</td>' +
          '<td class="small muted">View training →</td></tr>';
      }).join('') +
      '</tbody></table>' +
    '</div>' +
    '<div class="grid grid-2 mt-24">' +
      '<div class="card"><h3>Weakest Training Topics (team-wide)</h3>' + (weakest.length ? weakest.map(function (t) { return '<div class="flex-between small" style="padding:6px 0;"><span>' + escapeHtml(t) + '</span><span class="pill pill-orange">' + weakTopicCounts[t] + ' reps</span></div>'; }).join('') : '<p class="small muted">No weak topics flagged.</p>') + '</div>' +
      '<div class="card"><h3>Team Skill Matrix</h3><p class="small">Visual heat-map across 15 skill areas.</p><button class="btn btn-dark btn-sm" onclick="navigate(\'manager/analytics\')">Open Skill Matrix</button></div>' +
    '</div>'
  );
}

// ---------------- Individual rep training detail (admin/manager drill-down) ----------------
function renderRepDetailPage(memberId) {
  var team = getTeamData(function () { renderShell('manager', renderRepDetailPage(memberId)); });
  if (!team) return loadingCard('Loading rep training record…');
  var m = team.find(function (x) { return x.id === memberId; });
  if (!m) return '<p>Rep not found. <a href="#/manager">Back to team</a></p>';

  function courseSection(courseDef, pct, certified) {
    var mods = moduleListFor(m, courseDef, pct);
    var attempts = examAttemptsFor(m, courseDef.id);
    return '<div class="card mt-16">' +
      '<div class="flex-between"><h3 class="mb-0">' + courseDef.icon + ' ' + escapeHtml(courseDef.title) + '</h3>' +
      '<span class="pill ' + (certified ? 'pill-green' : (pct > 0 ? 'pill-blue' : 'pill-gray')) + '">' + (certified ? 'Certified' : pct + '% complete') + '</span></div>' +
      '<div class="progress-track mt-8"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' +
      '<div class="grid grid-2 mt-16" style="max-height:260px;overflow-y:auto;">' +
        mods.map(function (mod) {
          return '<div class="small flex-between" style="padding:5px 0;border-bottom:1px solid var(--border);">' +
            '<span>' + (mod.complete ? '✅' : mod.lessonsDone > 0 ? '🟡' : '⚪') + ' Module ' + mod.number + ': ' + escapeHtml(mod.title) + '</span>' +
            '<span class="tiny muted">' + mod.lessonsDone + '/' + mod.lessonsTotal + '</span></div>';
        }).join('') +
      '</div>' +
      (attempts.length ? '<p class="small mt-16 mb-0"><strong>Exam attempts:</strong> ' + attempts.map(function (a) { return (a.passed ? '✅' : '❌') + ' ' + a.scorePct + '% (' + fmtDate(a.at) + ')'; }).join(' · ') + '</p>' : '<p class="small mt-16 mb-0 muted">No exam attempts yet.</p>');
  }

  return (
    '<a class="tiny muted" href="#/manager" style="text-decoration:none;">← Back to Team Dashboard</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Rep Training Detail</span><h1>' + escapeHtml(m.name) + '</h1><p class="mb-0">' + escapeHtml(m.role) + ' · Last activity ' + fmtDate(m.lastActivity) + '</p></div>' +
      '<span class="pill ' + CERT_STATUS_PILL[m.advisorStatus === 'certified' ? 'certified' : m.advisorStatus === 'ready' ? 'ready_for_exam' : 'locked'] + '">Energy Advisor: ' + (m.advisorStatus === 'certified' ? 'Certified' : m.advisorStatus === 'ready' ? 'Ready for Exam' : 'Locked') + '</span></div>' +
    '<div class="grid grid-4 mt-8">' +
      statTile('📝', m.quizAvg + '%', 'Quiz Average') +
      statTile('🎓', m.examAvg ? m.examAvg + '%' : '—', 'Best Exam Score') +
      statTile('⏱️', m.trainingHours + 'h', 'Training Hours') +
      statTile('⚠️', m.weakTopics.length, 'Weak Topics Flagged') +
    '</div>' +
    courseSection(SOLAR_COURSE, m.solarPct, m.solarCert) +
    courseSection(HVAC_COURSE, m.hvacPct, m.hvacCert) +
    (m.weakTopics.length ? '<div class="callout compliance mt-16"><h4>Weak Topics</h4><p class="mb-0">' + m.weakTopics.map(escapeHtml).join(', ') + ' — recommend revisiting the related modules or assigning a coaching session.</p></div>' : '')
  );
}

// ---------------- Skill Matrix / Analytics ----------------
function skillCellColor(score) {
  if (score >= 85) return 'rgba(46,138,86,.75)';
  if (score >= 65) return 'rgba(255,165,1,.7)';
  return 'rgba(192,57,43,.55)';
}
function renderManagerAnalyticsPage() {
  var team = getTeamData(function () { renderShell('manager/analytics', renderManagerAnalyticsPage()); });
  if (!team) return loadingCard('Loading team analytics…');
  if (!team.length) return '<a class="tiny muted" href="#/manager" style="text-decoration:none;">← Back to Team Dashboard</a><div class="callout tip mt-16"><h4>No reps yet</h4><p class="mb-0">Invite reps to see the skill matrix.</p></div>';
  var matrixHtml = '<div style="overflow-x:auto;"><table class="lesson-table" style="min-width:900px;"><thead><tr><th>Rep</th>' +
    TEAM_SKILL_LIST.map(function (s) { return '<th style="writing-mode:vertical-rl;text-orientation:mixed;font-size:.65rem;">' + escapeHtml(s) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    team.map(function (m) {
      return '<tr><td style="font-weight:700;white-space:nowrap;">' + escapeHtml(m.name) + '</td>' +
        TEAM_SKILL_LIST.map(function (s) {
          var score = teamSkillScore(m, s);
          return '<td style="text-align:center;background:' + skillCellColor(score) + ';color:#fff;font-weight:700;font-size:.72rem;">' + score + '</td>';
        }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';

  return (
    '<a class="tiny muted" href="#/manager" style="text-decoration:none;">← Back to Team Dashboard</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Manager Analytics</span><h1>Team Skill Matrix</h1></div></div>' +
    '<div class="card">' + matrixHtml + '</div>' +
    '<div class="grid grid-3 mt-24">' +
      '<div class="card"><h3>Certification Expiration</h3><p class="small">No certifications are currently expiring. Renewal reminders will surface here 60 days before expiration.</p></div>' +
      '<div class="card"><h3>Exports</h3><p class="small">Export employee progress, certification, and exam performance reports.</p>' +
        '<div class="tag-row mt-8"><button class="btn btn-outline btn-sm" onclick="alert(\'CSV export would download here in a connected environment.\')">CSV</button><button class="btn btn-outline btn-sm" onclick="alert(\'Excel export would download here in a connected environment.\')">Excel</button><button class="btn btn-outline btn-sm" onclick="alert(\'PDF export would download here in a connected environment.\')">PDF</button></div></div>' +
      '<div class="card"><h3>Notifications</h3><p class="small">Managers are notified when a rep completes a certification or falls behind on training pace.</p></div>' +
    '</div>'
  );
}

// ---------------- Admin: Course Manager / Question Bank / Certifications / Content Library / Users / Settings ----------------
function renderAdminPlaceholderPage(section) {
  if (section === 'courses') return renderAdminCourseManager();
  if (section === 'questions') return renderAdminQuestionBank();
  if (section === 'certifications') return renderAdminCertifications();
  if (section === 'users') return renderAdminUsers();
  if (section === 'settings') return renderAdminSettings();
  return '<p>Not found.</p>';
}

function renderAdminCourseManager() {
  var drafts = NexisState.get().contentDrafts;
  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Course Manager</h1></div></div>' +
    '<div class="grid grid-3">' + COURSES.map(function (c) {
      return '<div class="card"><h3>' + c.icon + ' ' + escapeHtml(c.title) + '</h3><p class="small">' + c.modules.length + ' modules · ' + c.modules.reduce(function (s, m) { return s + m.lessons.length; }, 0) + ' lessons · ' + examBankFor(c).length + ' exam questions</p>' +
        '<div class="tag-row"><button class="btn btn-outline btn-sm" onclick="alert(\'Would open a module editor: add lesson, video, PDF, image, link, quiz, or question.\')">Add Module</button><button class="btn btn-outline btn-sm" onclick="navigate(\'admin/questions\')">Question Bank</button></div></div>';
    }).join('') + '</div>' +
    '<h2 class="mt-32">Import Training Document</h2>' +
    '<div class="card">' +
      '<p class="small">Upload a source PDF/doc. The admin reviews and approves every proposed course, module, lesson, and question before anything is published — AI-generated training is never auto-published.</p>' +
      '<input type="file" id="import-doc-file" accept=".pdf,.doc,.docx,.txt"> ' +
      '<button class="btn btn-primary btn-sm" onclick="proposeImportDraft()">Analyze &amp; Propose Draft</button>' +
      '<div id="import-drafts" class="mt-16 stack">' + drafts.map(renderDraftCard).join('') + '</div>' +
    '</div>'
  );
}
function proposeImportDraft() {
  var fileInput = qs('#import-doc-file');
  var name = (fileInput.files && fileInput.files[0]) ? fileInput.files[0].name : 'Untitled document';
  var st = NexisState.get();
  st.contentDrafts.unshift({
    id: uid('draft'), fileName: name, status: 'awaiting_review', proposedCourse: 'New Course (from ' + name + ')',
    proposedModules: ['Module 1 (proposed)', 'Module 2 (proposed)'],
    note: 'This is a prototype: full automated PDF parsing is not connected in this environment. In production, an AI pass would propose modules, lessons, learning objectives, key terms, quiz/exam questions, scenario questions, and compliance warnings here for your review.'
  });
  NexisState.persist();
  renderShell('admin/courses', renderAdminCourseManager());
}
function renderDraftCard(d) {
  return '<div class="card" style="border-color:var(--nexis-orange);"><div class="flex-between"><strong>' + escapeHtml(d.fileName) + '</strong><span class="pill pill-orange">Awaiting Review</span></div>' +
    '<p class="small mt-8">Proposed course: ' + escapeHtml(d.proposedCourse) + '</p>' +
    '<ul class="lesson-list">' + d.proposedModules.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('') + '</ul>' +
    '<p class="tiny muted">' + escapeHtml(d.note) + '</p>' +
    '<div class="tag-row"><button class="btn btn-primary btn-sm" onclick="alert(\'Approved drafts would publish into the Course Manager after admin review.\')">Approve &amp; Publish</button><button class="btn btn-ghost btn-sm" onclick="discardDraft(\'' + d.id + '\')">Discard</button></div></div>';
}
function discardDraft(id) {
  var st = NexisState.get();
  st.contentDrafts = st.contentDrafts.filter(function (d) { return d.id !== id; });
  NexisState.persist();
  renderShell('admin/courses', renderAdminCourseManager());
}

function renderAdminQuestionBank() {
  var courseSel = window._qbCourse || 'solar';
  var courseDef = courseById(courseSel);
  var bank = examBankFor(courseDef);
  var byCat = {};
  bank.forEach(function (q) { byCat[q.category] = (byCat[q.category] || 0) + 1; });
  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Question Bank</h1></div></div>' +
    '<div class="tag-row mb-16">' + COURSES.map(function (c) { return '<button class="btn ' + (courseSel === c.id ? 'btn-dark' : 'btn-outline') + ' btn-sm" onclick="window._qbCourse=\'' + c.id + '\';renderShell(\'admin/questions\',renderAdminQuestionBank())">' + c.short + '</button>'; }).join('') + '</div>' +
    '<div class="card"><p class="small">' + bank.length + ' total questions · ' + courseDef.exam.numQuestions + ' selected randomly per exam attempt · Pass ' + courseDef.exam.passPct + '% (Compliance min ' + courseDef.exam.complianceMinPct + '%)</p>' +
      '<div class="grid grid-4 mt-8">' + Object.keys(byCat).map(function (cat) { return '<div class="stat-tile"><div class="stat-value">' + byCat[cat] + '</div><div class="stat-label">' + escapeHtml(cat) + '</div></div>'; }).join('') + '</div>' +
    '</div>' +
    '<div class="card mt-16"><button class="btn btn-outline btn-sm" onclick="alert(\'Would open a question editor to add or edit questions in this bank.\')">Add Question</button></div>'
  );
}

function renderAdminCertifications() {
  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Certifications</h1></div></div>' +
    '<div class="grid grid-3">' + COURSES.map(function (c) {
      return '<div class="card"><h3>' + c.icon + ' ' + escapeHtml(c.title) + '</h3>' +
        (c.requires ? '<p class="small">Requires: ' + c.requires.map(function (r) { return courseById(r).short; }).join(' + ') + ' (Active)</p>' : '<p class="small">No prerequisites — independent certification.</p>') +
        '<p class="small">Passing score: ' + c.exam.passPct + '% · Compliance min: ' + c.exam.complianceMinPct + '%</p>' +
        (c.practicalExam ? '<p class="small">Includes a practical evaluation.</p>' : '') +
      '</div>';
    }).join('') + '</div>' +
    '<div class="callout tip mt-24"><h4>Certification dependency rule</h4><p class="mb-0">If a prerequisite certification expires, the dependent certification (Energy Advisor) displays RENEWAL REQUIRED. Prior certification history is never deleted automatically.</p></div>'
  );
}

function renderAdminMassSaveOrContentPage(sub) {
  if (sub === 'mass-save') return renderMassSaveProgramsPage();
  var timeSensitiveTopics = ['Tax Credits', 'Mass Save', 'SMART', 'Net Metering', 'Utility programs', 'Financing', 'Rebates', 'Electricity rates', 'Warranty terms', 'Company promotions'];
  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Content Library</h1></div></div>' +
    '<div class="callout compliance"><h4>Time-sensitive content tracking</h4><p class="mb-0">Content tied to these topics carries Source, Effective Date, Last Verified Date, Review Date, Reviewed By, and a Status (Active / Review Needed / Expired).</p></div>' +
    '<div class="grid grid-3 mt-16">' + timeSensitiveTopics.map(function (t) { return '<div class="card"><strong>' + escapeHtml(t) + '</strong><p class="tiny muted mt-8">Tracked in the Mass Save Programs database and course sources.</p></div>'; }).join('') + '</div>' +
    '<div class="mt-24"><button class="btn btn-dark btn-sm" onclick="navigate(\'admin/mass-save\')">Open Mass Save Program Database</button></div>'
  );
}

function renderAdminUsers() {
  var me = NexisState.get().user;
  var inviteSection = window.NEXIS_BACKEND_READY ? (
    '<div class="card mt-16"><h3>Invite someone</h3><p class="small">Sends a real invitation email right away — the person clicks the link, sets a password, and they’re in. Only people invited here can create an account. Choose their role below: Sales Representative, Manager, or Admin (admins can see everyone’s training and invite other admins).</p>' +
      '<form id="invite-form" class="flex gap-10" style="align-items:flex-end;flex-wrap:wrap;">' +
        '<div class="field mb-0" style="flex:1;min-width:220px;"><label>Work email</label><input type="email" id="inv-email" placeholder="rep@nexispower.com" required></div>' +
        '<div class="field mb-0"><label>Role</label><select id="inv-role"><option value="rep">Sales Representative</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>' +
        '<button type="submit" class="btn btn-primary">Send Invite</button>' +
      '</form>' +
      '<p id="invite-status" class="small mt-8" style="display:none;"></p>' +
    '</div>'
  ) : '<div class="callout tip mt-16"><h4>Connect Supabase to enable real invites</h4><p class="mb-0">Once js/config.js has your project URL and anon key, this becomes a real invite form and the list below shows real reps instead of demo data.</p></div>';

  var team = getTeamData(function () { renderShell('admin/users', renderAdminUsers()); });
  var tableHtml = !team ? loadingCard('Loading users…') : (
    '<div class="card mt-16"><table class="lesson-table"><thead><tr><th>Name</th><th>Role</th><th>Solar</th><th>HVAC</th><th>Advisor</th><th></th></tr></thead><tbody>' +
      '<tr><td style="font-weight:700;">' + escapeHtml(me.name) + ' (you)</td><td>' + escapeHtml(me.role) + '</td>' +
      '<td>' + CERT_STATUS_LABEL[NexisState.certStatus(SOLAR_COURSE)] + '</td><td>' + CERT_STATUS_LABEL[NexisState.certStatus(HVAC_COURSE)] + '</td><td>' + CERT_STATUS_LABEL[NexisState.certStatus(ENERGY_ADVISOR_COURSE)] + '</td><td></td></tr>' +
      team.map(function (m) { return '<tr style="cursor:pointer;" onclick="navigate(\'manager/rep/' + m.id + '\')"><td style="font-weight:700;">' + escapeHtml(m.name) + '</td><td>' + escapeHtml(m.role) + '</td><td>' + certCellForMember(m, 'solar') + '</td><td>' + certCellForMember(m, 'hvac') + '</td><td>' + certCellForMember(m, 'advisor') + '</td><td class="small muted">View training →</td></tr>'; }).join('') +
    '</tbody></table></div>'
  );

  setTimeout(bindInviteForm, 0);
  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Users</h1><p class="mb-0">Admins can open any rep’s full training record — module progress, quiz/exam history, and flagged weak topics.</p></div></div>' +
    inviteSection + tableHtml
  );
}
function bindInviteForm() {
  var form = qs('#invite-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = qs('#inv-email').value.trim();
    var role = qs('#inv-role').value;
    var statusEl = qs('#invite-status');
    if (role === 'admin' && !confirm('Invite ' + email + ' as an ADMIN? They will have full access to every rep’s training data, the content manager, and the ability to invite other admins. Continue?')) return;
    var submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    dbInviteRep(email, role, null).then(function (res) {
      submitBtn.disabled = false;
      statusEl.style.display = 'block';
      if (res.error) {
        // Only an unexpected crash (no JSON body at all) reaches this path now
        // — the function itself returns ok:false with a real message on 200.
        statusEl.style.color = '#C0392B';
        statusEl.textContent = res.error.message;
        return;
      }
      if (!res.data || res.data.ok === false) {
        statusEl.style.color = '#C0392B';
        statusEl.textContent = (res.data && res.data.error) || 'Could not send the invite.';
        return;
      }
      if (res.data.emailSent === false) {
        statusEl.style.color = '#9A5B00';
        statusEl.textContent = '⚠️ ' + email + ' was whitelisted, but the invite email could not be sent (' + (res.data.warning || 'unknown error') + '). They may already have an account — try signing in instead.';
      } else {
        statusEl.style.color = '#2E8A56';
        statusEl.textContent = '✅ Invited ' + email + ' — they’ll get an email with a link to set their password and sign in.';
      }
      form.reset();
    });
  });
}

function renderAdminSettings() {
  return (
    '<div class="section-head"><div><span class="eyebrow">Admin</span><h1>Settings</h1></div></div>' +
    '<div class="grid grid-2">' +
      '<div class="card"><h3>Language</h3><p class="small">English is the default language. Spanish support is architected throughout (courses, exams, coach) with consistent industry terminology (kW, kWh, Net Metering, PPA, Lease, BTU, Manual J, Mass Save, HEAT Loan kept untranslated).</p>' +
        '<select disabled><option>English (default)</option><option>Español (coming soon)</option></select></div>' +
      '<div class="card"><h3>Branding</h3><p class="small">Nexis Orange #FFA501 · Dark Charcoal #2B3D4A · Secondary Blue #445A7D · Warm White #FAFAF6.</p></div>' +
      '<div class="card"><h3>Notifications</h3><label class="small"><input type="checkbox" checked disabled> Notify managers on certification completion</label><br><label class="small"><input type="checkbox" checked disabled> Notify reps when a program status changes to Review Needed</label></div>' +
      '<div class="card"><h3>Data</h3><p class="small">This prototype stores all progress locally in your browser (localStorage). A production deployment would sync this to a real database.</p></div>' +
    '</div>'
  );
}
