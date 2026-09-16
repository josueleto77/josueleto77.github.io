/* ============================================================
   Course pages: overview, module, lesson, knowledge check, exam,
   exam result, certificate, practical exam (Energy Advisor)
   ============================================================ */

// ---------------- Lesson content block renderer ----------------
function renderBlock(block) {
  if (block.type === 'p') return '<div class="lesson-block"><p>' + escapeHtml(block.text) + '</p></div>';
  if (block.type === 'list') {
    return '<div class="lesson-block">' + (block.title ? '<h4>' + escapeHtml(block.title) + '</h4>' : '') +
      '<ul class="lesson-list">' + block.items.map(function (i) { return '<li>' + escapeHtml(i) + '</li>'; }).join('') + '</ul></div>';
  }
  if (block.type === 'table') {
    return '<div class="lesson-block">' + (block.title ? '<h4>' + escapeHtml(block.title) + '</h4>' : '') +
      '<table class="lesson-table"><thead><tr>' + block.headers.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + block.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + escapeHtml(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  if (block.type === 'say') return '<div class="lesson-block callout say-it"><h4>How to say it</h4><p class="mb-0">' + escapeHtml(block.text) + '</p></div>';
  if (block.type === 'callout') {
    var kind = block.kind || 'tip';
    return '<div class="lesson-block callout ' + kind + '"><h4>' + escapeHtml(block.title || '') + '</h4><p class="mb-0">' + escapeHtml(block.text) + '</p></div>';
  }
  return '';
}

function moduleIndex(courseDef, moduleId) { return courseDef.modules.findIndex(function (m) { return m.id === moduleId; }); }
function totalLessonMinutes(mod) { return mod.lessons.reduce(function (s, l) { return s + (l.estMinutes || 6); }, 0); }

// ---------------- Course overview ----------------
function renderCourseOverviewPage(courseDef) {
  var status = NexisState.certStatus(courseDef);
  var p = NexisState.courseProgressPercent(courseDef);
  if (status === 'locked') {
    return (
      '<div class="card text-center" style="max-width:560px;margin:40px auto;padding:44px 30px;">' +
        '<div class="badge-medal locked" style="margin:0 auto 18px;font-size:32px;">🔒</div>' +
        '<h1>' + escapeHtml(courseDef.title) + '</h1>' +
        '<p>This is the advanced Nexis Power certification. It unlocks once you have earned <strong>both</strong> the Solar and HVAC certifications.</p>' +
        '<div class="grid grid-2 mt-24 text-center">' +
          '<div class="stat-tile">Solar: ' + (NexisState.hasPassedExam('solar') ? '✅ Certified' : '⏳ Not yet') + '</div>' +
          '<div class="stat-tile">HVAC: ' + (NexisState.hasPassedExam('hvac') ? '✅ Certified' : '⏳ Not yet') + '</div>' +
        '</div>' +
        '<button class="btn btn-dark mt-24" onclick="navigate(\'certifications\')">Back to Certifications</button>' +
      '</div>'
    );
  }
  var modsHtml = courseDef.modules.map(function (m, idx) {
    var stats = NexisState.moduleLessonStats(courseDef, m.id);
    var done = NexisState.isModuleComplete(courseDef, m.id);
    var prevDone = idx === 0 || NexisState.isModuleComplete(courseDef, courseDef.modules[idx - 1].id);
    var locked = !prevDone && !done;
    return (
      '<div class="card' + (locked ? '' : ' card-hover') + ' mt-16" style="display:flex;gap:16px;align-items:center;' + (locked ? 'opacity:.6;' : 'cursor:pointer;') + '" ' + (locked ? '' : 'onclick="navigate(\'course/' + courseDef.id + '/module/' + m.id + '\')"') + '>' +
        '<div class="status-dot ' + (done ? 'green' : (stats.done > 0 ? 'orange' : 'gray')) + '" style="width:14px;height:14px;flex-shrink:0;"></div>' +
        '<div style="flex:1;"><div style="font-weight:700;">Module ' + m.number + ': ' + escapeHtml(m.title) + '</div><div class="tiny muted">' + escapeHtml(m.subtitle || '') + ' · ' + totalLessonMinutes(m) + ' min</div></div>' +
        '<div class="tiny muted">' + stats.done + '/' + stats.total + '</div>' +
        (locked ? '<span class="tiny muted">🔒</span>' : (done ? '<span class="pill pill-green">Done</span>' : '<span class="muted">→</span>')) +
      '</div>'
    );
  }).join('');

  return (
    '<div class="section-head"><div><span class="eyebrow">' + escapeHtml(courseDef.short) + ' Certification</span><h1>' + courseDef.icon + ' ' + escapeHtml(courseDef.title) + '</h1><p class="mb-0">' + escapeHtml(courseDef.tagline) + '</p></div>' +
      '<span class="pill ' + CERT_STATUS_PILL[status] + '">' + CERT_STATUS_LABEL[status] + '</span></div>' +
    '<div class="progress-track"><div class="progress-fill" style="width:' + p + '%;"></div></div>' +
    '<p class="small mt-8">' + p + '% complete · ' + courseDef.modules.length + ' modules</p>' +
    (status === 'ready_for_exam' ? '<div class="callout tip mt-16"><h4>Ready for your final exam</h4><p class="mb-0">All modules complete. When you’re ready, take the ' + escapeHtml(courseDef.exam.name) + '.</p><button class="btn btn-primary btn-sm mt-8" onclick="navigate(\'exam/' + courseDef.id + '\')">Begin Final Exam</button></div>' : '') +
    (status === 'certified' ? '<div class="callout tip mt-16"><h4>Certified ✅</h4><p class="mb-0">You’ve completed this certification.</p><button class="btn btn-dark btn-sm mt-8" onclick="navigate(\'certificate/' + courseDef.id + '\')">View Certificate</button></div>' : '') +
    '<h2 class="mt-32">Modules</h2>' + modsHtml
  );
}

// ---------------- Module page ----------------
function renderModulePage(courseDef, moduleId) {
  var idx = moduleIndex(courseDef, moduleId);
  var mod = courseDef.modules[idx];
  if (!mod) return '<p>Module not found.</p>';
  var checkState = NexisState.courseProgress(courseDef.id).moduleChecks[moduleId];
  var lessonsHtml = mod.lessons.map(function (l) {
    var done = NexisState.isLessonComplete(courseDef.id, moduleId, l.id);
    return '<div class="card card-hover mt-16" style="display:flex;gap:14px;align-items:center;cursor:pointer;" onclick="navigate(\'course/' + courseDef.id + '/module/' + moduleId + '/lesson/' + l.id + '\')">' +
      '<span style="font-size:1.2rem;">' + (done ? '✅' : '📖') + '</span>' +
      '<div style="flex:1;"><div style="font-weight:700;">' + escapeHtml(l.title) + '</div><div class="tiny muted">' + (l.estMinutes || 6) + ' minutes</div></div>' +
      '<span class="muted">→</span></div>';
  }).join('');

  var allLessonsDone = mod.lessons.every(function (l) { return NexisState.isLessonComplete(courseDef.id, moduleId, l.id); });

  return (
    '<a class="tiny muted" href="#/course/' + courseDef.id + '" style="text-decoration:none;">← Back to ' + escapeHtml(courseDef.title) + '</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Module ' + mod.number + ' of ' + courseDef.modules.length + '</span><h1>' + escapeHtml(mod.title) + '</h1><p class="mb-0">' + escapeHtml(mod.subtitle || '') + '</p></div></div>' +
    '<h2 class="mt-24">Lessons</h2>' + lessonsHtml +
    (mod.knowledgeCheck ? (
      '<div class="card mt-24" style="border-color:' + (checkState && checkState.passed ? '#2E8A56' : 'var(--border)') + ';">' +
        '<div class="flex-between"><h3 class="mb-0">Knowledge Check</h3>' + (checkState && checkState.passed ? '<span class="pill pill-green">Passed · ' + checkState.scorePct + '%</span>' : '<span class="pill pill-gray">Not attempted</span>') + '</div>' +
        '<p class="small mt-8">' + mod.knowledgeCheck.length + ' quick questions to confirm this module stuck.</p>' +
        '<button class="btn ' + (allLessonsDone ? 'btn-primary' : 'btn-outline') + ' btn-sm mt-8" ' + (allLessonsDone ? '' : 'disabled title="Complete all lessons first"') + ' onclick="navigate(\'course/' + courseDef.id + '/module/' + moduleId + '/check\')">' + (checkState && checkState.passed ? 'Retake Knowledge Check' : 'Take Knowledge Check') + '</button>' +
      '</div>'
    ) : '') +
    renderModuleNextNav(courseDef, idx)
  );
}
function renderModuleNextNav(courseDef, idx) {
  var isLast = idx === courseDef.modules.length - 1;
  var status = NexisState.certStatus(courseDef);
  if (isLast && status === 'ready_for_exam') {
    return '<div class="callout tip mt-24"><h4>All modules complete</h4><p class="mb-0">You’re ready for the final exam.</p><button class="btn btn-primary btn-sm mt-8" onclick="navigate(\'exam/' + courseDef.id + '\')">Begin Final Exam</button></div>';
  }
  return '';
}

// ---------------- Lesson page ----------------
function findNextLessonTarget(courseDef, moduleId, lessonId) {
  var idx = moduleIndex(courseDef, moduleId);
  var mod = courseDef.modules[idx];
  var lIdx = mod.lessons.findIndex(function (l) { return l.id === lessonId; });
  if (lIdx < mod.lessons.length - 1) {
    return 'course/' + courseDef.id + '/module/' + moduleId + '/lesson/' + mod.lessons[lIdx + 1].id;
  }
  if (mod.knowledgeCheck) return 'course/' + courseDef.id + '/module/' + moduleId + '/check';
  if (idx < courseDef.modules.length - 1) return 'course/' + courseDef.id + '/module/' + courseDef.modules[idx + 1].id;
  return 'course/' + courseDef.id;
}

function renderLessonPage(courseDef, moduleId, lessonId) {
  var mod = courseDef.modules[moduleIndex(courseDef, moduleId)];
  var lesson = mod.lessons.find(function (l) { return l.id === lessonId; });
  if (!lesson) return '<p>Lesson not found.</p>';
  var done = NexisState.isLessonComplete(courseDef.id, moduleId, lessonId);
  return (
    '<a class="tiny muted" href="#/course/' + courseDef.id + '/module/' + moduleId + '" style="text-decoration:none;">← Back to Module ' + mod.number + '</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">' + escapeHtml(mod.title) + '</span><h1 class="mb-0">' + escapeHtml(lesson.title) + '</h1></div><span class="pill pill-blue">' + (lesson.estMinutes || 6) + ' MINUTES</span></div>' +
    '<div class="lesson-body mt-24">' + lesson.body.map(renderBlock).join('') + '</div>' +
    '<hr class="divider">' +
    '<button class="btn btn-primary" onclick="completeLessonAndAdvance(\'' + courseDef.id + '\',\'' + moduleId + '\',\'' + lessonId + '\',' + (lesson.estMinutes || 6) + ')">' + (done ? 'Continue →' : 'Mark Complete & Continue →') + '</button>'
  );
}
function completeLessonAndAdvance(courseId, moduleId, lessonId, estMinutes) {
  var courseDef = courseById(courseId);
  NexisState.markLessonComplete(courseId, moduleId, lessonId, estMinutes);
  maybeAwardModuleBadges(courseDef);
  navigate(findNextLessonTarget(courseDef, moduleId, lessonId));
}

// ---------------- Knowledge check (module) ----------------
function renderModuleCheckPage(courseDef, moduleId) {
  var mod = courseDef.modules[moduleIndex(courseDef, moduleId)];
  if (!mod.knowledgeCheck) return '<p>No knowledge check for this module.</p>';
  window._checkState = { courseId: courseDef.id, moduleId: moduleId, answers: {} };
  var qsHtml = mod.knowledgeCheck.map(function (q, i) {
    return (
      '<div class="card mt-16" id="check-q-' + i + '">' +
        '<p style="font-weight:700;">' + (i + 1) + '. ' + escapeHtml(q.q) + '</p>' +
        q.choices.map(function (c, ci) {
          return '<div class="quiz-option" onclick="answerCheckQuestion(' + i + ',' + ci + ')" id="check-q-' + i + '-opt-' + ci + '">' +
            '<span class="quiz-letter">' + String.fromCharCode(65 + ci) + '</span><span>' + escapeHtml(c) + '</span></div>';
        }).join('') +
        '<p class="tiny mt-8" id="check-q-' + i + '-explain" style="display:none;color:var(--ink-soft);"></p>' +
      '</div>'
    );
  }).join('');
  return (
    '<a class="tiny muted" href="#/course/' + courseDef.id + '/module/' + moduleId + '" style="text-decoration:none;">← Back to Module</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Knowledge Check</span><h1>' + escapeHtml(mod.title) + '</h1></div></div>' +
    qsHtml +
    '<button class="btn btn-primary mt-16" id="check-submit-btn" disabled onclick="submitModuleCheck(\'' + courseDef.id + '\',\'' + moduleId + '\')">Submit Answers</button>'
  );
}
function answerCheckQuestion(i, ci) {
  var st = window._checkState;
  if (st.answers[i] !== undefined) return; // lock after first answer
  st.answers[i] = ci;
  var courseDef = courseById(st.courseId);
  var mod = courseDef.modules[moduleIndex(courseDef, st.moduleId)];
  var q = mod.knowledgeCheck[i];
  q.choices.forEach(function (c, idx) {
    var el = qs('#check-q-' + i + '-opt-' + idx);
    if (idx === q.answerIndex) el.classList.add('correct');
    else if (idx === ci) el.classList.add('incorrect');
  });
  var ex = qs('#check-q-' + i + '-explain');
  ex.style.display = 'block';
  ex.textContent = (ci === q.answerIndex ? '✓ Correct. ' : '✗ Not quite. ') + q.explain;
  if (Object.keys(st.answers).length === mod.knowledgeCheck.length) {
    qs('#check-submit-btn').disabled = false;
  }
}
function submitModuleCheck(courseId, moduleId) {
  var courseDef = courseById(courseId);
  var mod = courseDef.modules[moduleIndex(courseDef, moduleId)];
  var st = window._checkState;
  var correct = 0;
  mod.knowledgeCheck.forEach(function (q, i) { if (st.answers[i] === q.answerIndex) correct++; });
  var scorePct = Math.round((correct / mod.knowledgeCheck.length) * 100);
  var passed = scorePct >= 70;
  NexisState.recordModuleCheck(courseId, moduleId, scorePct, passed);
  maybeAwardModuleBadges(courseDef);
  alert((passed ? 'Passed! ' : 'Keep practicing — ') + 'Score: ' + scorePct + '%');
  navigate('course/' + courseId + '/module/' + moduleId);
}

// Lightweight specialist-badge logic tied to module completion milestones.
function maybeAwardModuleBadges(courseDef) {
  if (courseDef.id === 'solar') {
    if (['sol-m1', 'sol-m2', 'sol-m3'].every(function (id) { return NexisState.isModuleComplete(courseDef, id); })) NexisState.awardBadge('spec-solar-fundamentals');
    if (NexisState.isModuleComplete(courseDef, 'sol-m9')) NexisState.awardBadge('spec-solar-finance');
    if (NexisState.isModuleComplete(courseDef, 'sol-m14')) NexisState.awardBadge('spec-d2d-ready');
    var checks = NexisState.courseProgress('solar').moduleChecks['sol-m18'];
    if (checks && checks.scorePct === 100) NexisState.awardBadge('spec-solar-compliance');
  }
  if (courseDef.id === 'hvac') {
    if (['hv-m1', 'hv-m2'].every(function (id) { return NexisState.isModuleComplete(courseDef, id); })) NexisState.awardBadge('spec-heat-pump-fundamentals');
    if (NexisState.isModuleComplete(courseDef, 'hv-m13')) NexisState.awardBadge('spec-mass-save-ready');
  }
}

// ============================================================
// EXAM ENGINE (final certification exam)
// ============================================================
var EXAM_SESSION = null;

function generateExamQuestions(courseDef) {
  var bank = examBankFor(courseDef);
  return shuffle(bank).slice(0, courseDef.exam.numQuestions);
}

function renderExamPage(courseDef) {
  if (!EXAM_SESSION || EXAM_SESSION.courseId !== courseDef.id || EXAM_SESSION.submitted) {
    EXAM_SESSION = { courseId: courseDef.id, questions: generateExamQuestions(courseDef), answers: {}, submitted: false };
  }
  var qsHtml = EXAM_SESSION.questions.map(function (q, i) {
    return (
      '<div class="card mt-16">' +
        '<span class="pill pill-blue">' + escapeHtml(q.category) + '</span>' +
        '<p style="font-weight:700;margin-top:10px;">' + (i + 1) + '. ' + escapeHtml(q.question) + '</p>' +
        q.choices.map(function (c, ci) {
          return '<div class="quiz-option" onclick="selectExamAnswer(' + i + ',' + ci + ')" id="exam-q-' + i + '-opt-' + ci + '">' +
            '<span class="quiz-letter">' + String.fromCharCode(65 + ci) + '</span><span>' + escapeHtml(c) + '</span></div>';
        }).join('') +
      '</div>'
    );
  }).join('');
  return (
    '<a class="tiny muted" href="#/course/' + courseDef.id + '" style="text-decoration:none;">← Back to course</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Final Exam</span><h1>' + escapeHtml(courseDef.exam.name) + '</h1>' +
      '<p class="mb-0">' + EXAM_SESSION.questions.length + ' questions · Passing score ' + courseDef.exam.passPct + '% · Compliance minimum ' + courseDef.exam.complianceMinPct + '%</p></div></div>' +
    '<div class="callout tip">You may retake this exam as many times as needed. Questions are drawn randomly from the certification question bank.</div>' +
    qsHtml +
    '<div class="card mt-16 text-center"><button class="btn btn-primary" id="exam-submit-btn" onclick="submitExam(\'' + courseDef.id + '\')">Submit Exam (' + Object.keys(EXAM_SESSION.answers).length + '/' + EXAM_SESSION.questions.length + ' answered)</button></div>'
  );
}
function selectExamAnswer(i, ci) {
  EXAM_SESSION.answers[i] = ci;
  EXAM_SESSION.questions.forEach(function (q, qi) {
    q.choices.forEach(function (c, cci) {
      var el = qs('#exam-q-' + qi + '-opt-' + cci);
      if (el) el.classList.toggle('selected', qi === i && cci === ci);
    });
  });
  var btn = qs('#exam-submit-btn');
  if (btn) btn.textContent = 'Submit Exam (' + Object.keys(EXAM_SESSION.answers).length + '/' + EXAM_SESSION.questions.length + ' answered)';
}
function submitExam(courseId) {
  var courseDef = courseById(courseId);
  var answered = Object.keys(EXAM_SESSION.answers).length;
  if (answered < EXAM_SESSION.questions.length) {
    if (!confirm('You have ' + (EXAM_SESSION.questions.length - answered) + ' unanswered questions. Submit anyway?')) return;
  }
  var byCategory = {};
  var correct = 0;
  EXAM_SESSION.questions.forEach(function (q, i) {
    var isCorrect = EXAM_SESSION.answers[i] === q.answerIndex;
    if (isCorrect) correct++;
    byCategory[q.category] = byCategory[q.category] || { total: 0, correct: 0 };
    byCategory[q.category].total++;
    if (isCorrect) byCategory[q.category].correct++;
  });
  var scorePct = Math.round((correct / EXAM_SESSION.questions.length) * 100);
  var complianceCat = byCategory['Compliance'];
  var compliancePct = complianceCat ? Math.round((complianceCat.correct / complianceCat.total) * 100) : 100;
  var passed = scorePct >= courseDef.exam.passPct && compliancePct >= courseDef.exam.complianceMinPct;

  var categoryBreakdown = Object.keys(byCategory).map(function (cat) {
    var d = byCategory[cat];
    return { category: cat, total: d.total, correct: d.correct, pct: Math.round((d.correct / d.total) * 100) };
  }).sort(function (a, b) { return a.pct - b.pct; });

  var attempt = NexisState.recordExamAttempt(courseId, { scorePct: scorePct, compliancePct: compliancePct, passed: passed, totalQuestions: EXAM_SESSION.questions.length, correct: correct, categoryBreakdown: categoryBreakdown });
  if (passed) {
    NexisState.awardBadge(courseDef.badgeId);
    if (courseDef.id === 'solar') NexisState.awardBadge('spec-solar-objections');
    if (courseDef.id === 'hvac') NexisState.awardBadge('spec-hvac-objections');
  }
  EXAM_SESSION.submitted = true;
  navigate('exam/' + courseId + '/result/' + attempt.id);
}

function renderExamResultPage(courseDef, attemptId) {
  var attempts = NexisState.get().examAttempts[courseDef.id] || [];
  var attempt = attempts.find(function (a) { return a.id === attemptId; }) || attempts[0];
  if (!attempt) return '<p>No exam attempt found. <a href="#/exam/' + courseDef.id + '">Take the exam</a></p>';
  var weakCats = attempt.categoryBreakdown.filter(function (c) { return c.pct < 80; });
  return (
    '<div class="card text-center" style="max-width:640px;margin:20px auto;padding:40px 30px;">' +
      '<div class="badge-medal ' + (attempt.passed ? courseDef.theme : 'locked') + '" style="margin:0 auto 18px;font-size:32px;">' + (attempt.passed ? courseDef.icon : '📚') + '</div>' +
      '<h1>' + (attempt.passed ? 'Certified! 🎉' : 'NOT YET CERTIFIED') + '</h1>' +
      '<p style="font-size:1.1rem;font-weight:700;color:var(--nexis-charcoal);">Score: ' + attempt.scorePct + '% (' + attempt.correct + '/' + attempt.totalQuestions + ') · Compliance: ' + attempt.compliancePct + '%</p>' +
      (attempt.passed ?
        '<p>You’ve met the ' + courseDef.exam.passPct + '% passing score and ' + courseDef.exam.complianceMinPct + '% compliance minimum.</p><button class="btn btn-primary mt-16" onclick="navigate(\'certificate/' + courseDef.id + '\')">View Your Certificate</button>' :
        '<p>You need ' + courseDef.exam.passPct + '% overall and ' + courseDef.exam.complianceMinPct + '% on Compliance questions to certify. Review the areas below, then retake when ready.</p><button class="btn btn-primary mt-16" onclick="navigate(\'exam/' + courseDef.id + '\')">Retake Exam</button>') +
      '<button class="btn btn-outline mt-8" onclick="navigate(\'course/' + courseDef.id + '\')">Back to Course</button>' +
    '</div>' +
    (weakCats.length ? (
      '<h2 class="mt-24">Areas to Review</h2>' +
      '<div class="grid grid-3">' + weakCats.map(function (c) {
        return '<div class="card"><div class="flex-between"><strong>' + escapeHtml(c.category) + '</strong><span class="pill ' + (c.pct < 60 ? 'pill-gray' : 'pill-orange') + '">' + c.pct + '%</span></div>' +
          '<p class="small mt-8 mb-0">' + c.correct + ' of ' + c.total + ' correct. Revisit the related module lessons before retaking.</p></div>';
      }).join('') + '</div>'
    ) : '<div class="callout tip mt-24"><h4>Strong across the board</h4><p class="mb-0">No category fell below 80% this attempt.</p></div>')
  );
}

// ---------------- Certificate ----------------
function renderCertificatePage(courseDef) {
  if (!courseDef || NexisState.certStatus(courseDef) !== 'certified') {
    return '<div class="card text-center" style="max-width:520px;margin:40px auto;"><h2>Not certified yet</h2><p>Complete the certification exam to unlock your certificate.</p><button class="btn btn-primary" onclick="navigate(\'certifications\')">Back to Certifications</button></div>';
  }
  var user = NexisState.get().user;
  var certId = NexisState.certificateId(courseDef.id);
  var date = fmtDate(new Date().toISOString());
  var isAdvisor = courseDef.id === 'energy-advisor';
  return (
    '<div class="no-print flex-between mt-0" style="margin-bottom:18px;"><a class="tiny muted" href="#/certifications" style="text-decoration:none;">← Back to Certifications</a><button class="btn btn-dark btn-sm" onclick="window.print()">Print / Save as PDF</button></div>' +
    '<div class="certificate-frame">' +
      '<div class="certificate-seal">' + courseDef.icon + '</div>' +
      '<div style="display:flex;justify-content:center;margin-bottom:6px;">' + nexisLogoSVG({ height: 24 }) + '</div>' +
      '<p class="tiny" style="letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);">Nexis Power Academy</p>' +
      '<h2 style="text-transform:uppercase;letter-spacing:.05em;">' + (isAdvisor ? 'Advanced Certification' : 'Certificate of Completion') + '</h2>' +
      '<p class="mt-16 small">This certifies that</p>' +
      '<h1 style="font-size:2rem;margin:6px 0;">' + escapeHtml(user.name) + '</h1>' +
      '<p class="small">has successfully completed ' + (isAdvisor ? 'all requirements to become a' : 'the') + '</p>' +
      '<h2 style="color:var(--nexis-orange-2);text-transform:uppercase;">' + escapeHtml(courseDef.title.replace('Nexis ', '').replace(' Certification', '')) + (isAdvisor ? '' : ' Certification') + '</h2>' +
      (isAdvisor ? (
        '<div class="grid grid-3 mt-24 text-center">' +
          '<div class="stat-tile">Solar Certified<br><span style="font-size:1.3rem;">✅</span></div>' +
          '<div class="stat-tile">HVAC Certified<br><span style="font-size:1.3rem;">✅</span></div>' +
          '<div class="stat-tile">Advanced Assessment<br><span style="font-size:1.3rem;">✅</span></div>' +
        '</div>'
      ) : '') +
      '<div class="grid grid-2 mt-32" style="text-align:left;max-width:420px;margin:32px auto 0;">' +
        '<div><p class="tiny muted mb-0">Certificate ID</p><p style="font-weight:700;">' + certId + '</p></div>' +
        '<div><p class="tiny muted mb-0">Date</p><p style="font-weight:700;">' + date + '</p></div>' +
      '</div>' +
      '<p class="tiny muted mt-24">Authorized by Nexis Power LLC</p>' +
    '</div>'
  );
}

// ============================================================
// PRACTICAL EVALUATION (Energy Advisor)
// ============================================================
function renderPracticalExamPage(courseDef) {
  if (!courseDef.practicalExam) return '<p>No practical exam for this certification.</p>';
  if (!NexisState.hasPassedExam(courseDef.id)) {
    return '<div class="card text-center" style="max-width:520px;margin:40px auto;"><h2>Pass the written exam first</h2><p>The practical evaluation unlocks after you pass the ' + escapeHtml(courseDef.exam.name) + '.</p><button class="btn btn-primary" onclick="navigate(\'exam/' + courseDef.id + '\')">Go to Exam</button></div>';
  }
  var sc = courseDef.practicalScenario;
  var best = NexisState.bestPracticalAttempt(courseDef.id);
  window._practicalState = { discovery: {}, diagnosis: {}, specialists: {}, compliance: {}, nextStep: '' };
  var discoveryTopics = ['Electricity usage / average bill', 'Heating fuel and cost', 'Cooling system status', 'Comfort problems by room', 'Insulation and air leakage', 'Roof age and condition', 'Electrical service capacity', 'Future EV plans', 'Length of expected home ownership'];
  var diagnosisFlags = ['Roof nearing end of life (18 years) needs inspection before solar', 'Poor attic insulation undermines HVAC sizing and comfort', 'Electrical capacity must be checked for EV + HVAC + solar together', 'High oil heating cost is a real electrification opportunity, not just a solar opportunity'];
  var specialists = ['Licensed roofer (roof condition/age review)', 'Licensed electrician (panel/service capacity review)', 'Insulation / weatherization assessor'];
  var complianceChecks = ['I did not guarantee a specific dollar savings amount', 'I did not guarantee a specific rebate amount without verification', 'I did not personally certify roof or electrical adequacy — I recommended specialist review', 'I did not promise a firm installation timeline'];

  return (
    '<a class="tiny muted" href="#/course/' + courseDef.id + '" style="text-decoration:none;">← Back to course</a>' +
    '<div class="section-head mt-8"><div><span class="eyebrow">Practical Evaluation</span><h1>' + escapeHtml(sc.title) + '</h1></div>' +
      (best ? '<span class="pill ' + (best.passed ? 'pill-green' : 'pill-orange') + '">Best score: ' + best.scorePct + '%</span>' : '') + '</div>' +
    '<div class="card"><h3>Customer Profile</h3><ul class="lesson-list">' + sc.homeProfile.map(function (h) { return '<li>' + escapeHtml(h) + '</li>'; }).join('') + '</ul>' +
      '<p class="small mt-8 mb-0">' + escapeHtml(sc.instructions) + '</p></div>' +

    '<div class="card mt-16"><h3>1. Discovery — what would you ask about?</h3><p class="tiny muted">Check everything you would cover before recommending anything.</p>' +
      checkboxList('discovery', discoveryTopics) + '</div>' +
    '<div class="card mt-16"><h3>2. Diagnosis — what issues do you identify?</h3>' +
      checkboxList('diagnosis', diagnosisFlags) + '</div>' +
    '<div class="card mt-16"><h3>3. Specialists — who may need to review the property?</h3>' +
      checkboxList('specialists', specialists) + '</div>' +
    '<div class="card mt-16"><h3>4. Compliance self-check</h3>' +
      checkboxList('compliance', complianceChecks) + '</div>' +
    '<div class="card mt-16"><h3>5. Recommended next step</h3>' +
      '<textarea id="practical-next-step" rows="3" style="width:100%;border-radius:10px;border:1.5px solid var(--border);padding:12px;font-family:inherit;" placeholder="e.g. Recommend a weatherization/energy assessment plus a roof inspection before finalizing solar sizing; revisit HVAC and EV-charging plans once envelope and electrical capacity are confirmed."></textarea></div>' +

    '<div class="card mt-16" style="text-align:center;"><button class="btn btn-primary" onclick="submitPracticalExam(\'' + courseDef.id + '\')">Submit Practical Evaluation</button>' +
      '<p class="tiny muted mt-8 mb-0">Scored on Discovery (20), Diagnosis (20), Technical Accuracy (20), Compliance (20), Communication (10), and Next-Step Recommendation (10). Passing: 85/100. A manager can review and countersign this worksheet in the field.</p></div>'
  );
}
function checkboxList(group, items) {
  return '<div class="stack">' + items.map(function (it, i) {
    var id = group + '-' + i;
    return '<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;" class="small"><input type="checkbox" id="' + id + '" onchange="window._practicalState[\'' + group + '\'][' + i + ']=this.checked;" style="margin-top:3px;"> ' + escapeHtml(it) + '</label>';
  }).join('') + '</div>';
}
function submitPracticalExam(courseId) {
  var courseDef = courseById(courseId);
  var st = window._practicalState;
  function count(group) { return Object.keys(st[group]).filter(function (k) { return st[group][k]; }).length; }
  var discoveryScore = Math.round((count('discovery') / 9) * 20);
  var diagnosisScore = Math.round((count('diagnosis') / 4) * 20);
  var specialistScore = Math.round((count('specialists') / 3) * 10); // folded into technical accuracy below
  var technicalScore = Math.min(20, specialistScore + 10); // baseline + specialist awareness
  var complianceScore = Math.round((count('compliance') / 4) * 20);
  var nextStepText = (qs('#practical-next-step').value || '').trim();
  var communicationScore = nextStepText.length > 20 ? 10 : (nextStepText.length > 0 ? 6 : 0);
  var nextStepScore = /roof|insulat|electric|weatheriz|assess/i.test(nextStepText) ? 10 : (nextStepText.length > 0 ? 5 : 0);

  var total = discoveryScore + diagnosisScore + technicalScore + complianceScore + communicationScore + nextStepScore;
  var passed = total >= courseDef.practicalScenario.passScore;

  var attempt = NexisState.recordPracticalAttempt(courseId, {
    scorePct: total, passed: passed,
    breakdown: { discovery: discoveryScore, diagnosis: diagnosisScore, technical: technicalScore, compliance: complianceScore, communication: communicationScore, nextStep: nextStepScore },
    nextStepText: nextStepText
  });
  if (passed && NexisState.hasPassedExam(courseId)) NexisState.awardBadge(courseDef.badgeId);
  navigate('practical-result/' + courseId + '/' + attempt.id);
}

function renderPracticalResultPage(courseDef, attemptId) {
  var attempts = NexisState.get().practicalAttempts[courseDef.id] || [];
  var attempt = attempts.find(function (a) { return a.id === attemptId; }) || attempts[0];
  if (!attempt) return '<p>No practical attempt found.</p>';
  var rubric = courseDef.practicalScenario.rubric;
  var bd = attempt.breakdown;
  var rows = rubric.map(function (r) {
    return '<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border);"><span class="small">' + escapeHtml(r.label) + '</span><span class="small" style="font-weight:700;">' + (bd[r.key] || 0) + ' / ' + r.max + '</span></div>';
  }).join('');
  var certifiedNow = attempt.passed && NexisState.certStatus(courseDef) === 'certified';
  return (
    '<div class="card text-center" style="max-width:640px;margin:20px auto;padding:40px 30px;">' +
      '<div class="badge-medal ' + (attempt.passed ? 'advisor' : 'locked') + '" style="margin:0 auto 18px;font-size:32px;">' + (attempt.passed ? '⚡' : '📚') + '</div>' +
      '<h1>' + (attempt.passed ? 'Practical Evaluation Passed' : 'NOT YET CERTIFIED') + '</h1>' +
      '<p style="font-size:1.1rem;font-weight:700;color:var(--nexis-charcoal);">Score: ' + attempt.scorePct + ' / 100 (passing: ' + courseDef.practicalScenario.passScore + ')</p>' +
      (certifiedNow ? '<button class="btn btn-primary mt-16" onclick="navigate(\'certificate/' + courseDef.id + '\')">View Your Energy Advisor Certificate</button>' :
        '<p>Review the rubric below, refine your approach, and retake when ready.</p><button class="btn btn-primary mt-16" onclick="navigate(\'exam/' + courseDef.id + '/practical\')">Retake Practical</button>') +
    '</div>' +
    '<div class="card"><h3>Rubric Breakdown</h3>' + rows + '</div>'
  );
}
