/* ============================================================
   NEXIS POWER ACADEMY — State / Progress Engine
   Client-side prototype: all state lives in localStorage.
   This is the seam where a real backend (auth, Postgres/Supabase,
   multi-user sync) would plug in later without touching the UI layer.
   ============================================================ */

var NEXIS_STORAGE_KEY = 'nexis_academy_state_v1';

var XP_RULES = {
  lesson: 15,
  knowledgeCheck: 20,
  moduleComplete: 40,
  examPass: 300,
  badge: 50,
  labComplete: 25
};

function nowISO() { return new Date().toISOString(); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }

function defaultState() {
  return {
    version: 1,
    user: null, // { name, email, role: 'rep'|'manager'|'admin', initials }
    progress: {
      solar: { lessonsDone: {}, moduleChecks: {}, labsDone: {} },
      hvac: { lessonsDone: {}, moduleChecks: {}, labsDone: {} },
      'energy-advisor': { lessonsDone: {}, moduleChecks: {}, labsDone: {} }
    },
    examAttempts: { solar: [], hvac: [], 'energy-advisor': [] },
    practicalAttempts: { 'energy-advisor': [] },
    roleplayAttempts: [],
    badges: {}, // badgeId -> { earnedAt }
    xp: 0,
    xpLog: [],
    streak: { count: 0, lastActive: null },
    trainingMinutes: 0,
    massSavePrograms: null, // null = use defaults from data file; else admin overrides
    contentDrafts: [], // admin "import training document" proposals awaiting review
    adminAnnouncements: [],
    createdAt: nowISO()
  };
}

var NexisState = (function () {
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(NEXIS_STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      // shallow-merge with defaults so new fields added later don't crash old saves
      var d = defaultState();
      return Object.assign({}, d, parsed, {
        progress: Object.assign({}, d.progress, parsed.progress),
        examAttempts: Object.assign({}, d.examAttempts, parsed.examAttempts)
      });
    } catch (e) {
      console.warn('Nexis state load failed, resetting', e);
      return defaultState();
    }
  }

  function persist() {
    try { localStorage.setItem(NEXIS_STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function get() { return state; }

  function reset() { state = defaultState(); persist(); }

  function setUser(user) { state.user = user; persist(); }

  function isLoggedIn() { return !!state.user; }

  function touchStreak() {
    var today = todayKey();
    if (state.streak.lastActive === today) return;
    var last = state.streak.lastActive;
    if (last) {
      var diffDays = Math.round((new Date(today) - new Date(last)) / 86400000);
      state.streak.count = diffDays === 1 ? state.streak.count + 1 : 1;
    } else {
      state.streak.count = 1;
    }
    state.streak.lastActive = today;
    persist();
  }

  // When a real backend is connected, every mutation below also fires an
  // async, fire-and-forget write to Supabase. Failures are logged, never
  // thrown — localStorage always stays the source of truth for the current
  // render, so a flaky connection never breaks the UI.
  function syncing() { return window.NEXIS_BACKEND_READY && state.user && state.user.id; }
  function bg(promise, label) {
    if (promise && promise.then) promise.then(function (r) { if (r && r.error) console.warn('Nexis sync failed (' + label + ')', r.error); }, function (e) { console.warn('Nexis sync failed (' + label + ')', e); });
  }

  function addXP(amount, reason) {
    state.xp += amount;
    state.xpLog.unshift({ amount: amount, reason: reason, at: nowISO() });
    if (state.xpLog.length > 200) state.xpLog.length = 200;
    persist();
    if (syncing()) {
      bg(dbUpdateProfileStats(state.user.id, { xp: state.xp, training_minutes: state.trainingMinutes, streak_count: state.streak.count, last_active: state.streak.lastActive }), 'xp');
      bg(dbLogXp(state.user.id, amount, reason), 'xpLog');
    }
  }

  function awardBadge(badgeId) {
    if (state.badges[badgeId]) return false;
    state.badges[badgeId] = { earnedAt: nowISO() };
    if (syncing()) bg(dbAwardBadge(state.user.id, badgeId), 'badge');
    addXP(XP_RULES.badge, 'Badge earned: ' + badgeId);
    return true;
  }

  function hasBadge(badgeId) { return !!state.badges[badgeId]; }

  function courseProgress(courseId) {
    if (!state.progress[courseId]) state.progress[courseId] = { lessonsDone: {}, moduleChecks: {}, labsDone: {} };
    return state.progress[courseId];
  }

  function markLessonComplete(courseId, moduleId, lessonId, estMinutes) {
    var p = courseProgress(courseId);
    var key = moduleId + '::' + lessonId;
    if (!p.lessonsDone[key]) {
      p.lessonsDone[key] = nowISO();
      state.trainingMinutes += (estMinutes || 6);
      if (syncing()) bg(dbUpsertLesson(state.user.id, courseId, moduleId, lessonId, estMinutes || 6), 'lesson');
      addXP(XP_RULES.lesson, 'Lesson complete');
      touchStreak();
      persist();
      return true;
    }
    return false;
  }

  function isLessonComplete(courseId, moduleId, lessonId) {
    var p = courseProgress(courseId);
    return !!p.lessonsDone[moduleId + '::' + lessonId];
  }

  function recordModuleCheck(courseId, moduleId, scorePct, passed) {
    var p = courseProgress(courseId);
    var prev = p.moduleChecks[moduleId];
    var attempts = (prev ? prev.attempts : 0) + 1;
    p.moduleChecks[moduleId] = { scorePct: scorePct, passed: passed, attempts: attempts, lastAt: nowISO() };
    if (syncing()) bg(dbUpsertModuleCheck(state.user.id, courseId, moduleId, scorePct, passed, attempts), 'moduleCheck');
    if (passed) addXP(XP_RULES.knowledgeCheck, 'Knowledge check passed');
    touchStreak();
    persist();
  }

  function markLabComplete(courseId, labId) {
    var p = courseProgress(courseId);
    if (!p.labsDone[labId]) {
      p.labsDone[labId] = nowISO();
      if (syncing()) bg(dbUpsertLab(state.user.id, courseId, labId), 'lab');
      addXP(XP_RULES.labComplete, 'Lab complete: ' + labId);
      persist();
      return true;
    }
    return false;
  }

  // ---------- Module / course completion math (needs course def from data files) ----------
  function moduleLessonStats(courseDef, moduleId) {
    var mod = courseDef.modules.find(function (m) { return m.id === moduleId; });
    if (!mod) return { total: 0, done: 0 };
    var p = courseProgress(courseDef.id);
    var done = mod.lessons.filter(function (l) { return !!p.lessonsDone[moduleId + '::' + l.id]; }).length;
    return { total: mod.lessons.length, done: done };
  }

  function isModuleComplete(courseDef, moduleId) {
    var stats = moduleLessonStats(courseDef, moduleId);
    var p = courseProgress(courseDef.id);
    var check = p.moduleChecks[moduleId];
    var mod = courseDef.modules.find(function (m) { return m.id === moduleId; });
    var checkOk = !mod.knowledgeCheck || (check && check.passed);
    return stats.total > 0 && stats.done === stats.total && checkOk;
  }

  function courseProgressPercent(courseDef) {
    var totalLessons = 0, doneLessons = 0;
    courseDef.modules.forEach(function (m) {
      totalLessons += m.lessons.length;
      var stats = moduleLessonStats(courseDef, m.id);
      doneLessons += stats.done;
    });
    if (totalLessons === 0) return 0;
    return Math.round((doneLessons / totalLessons) * 100);
  }

  function allModulesComplete(courseDef) {
    return courseDef.modules.every(function (m) { return isModuleComplete(courseDef, m.id); });
  }

  function bestExamAttempt(courseId) {
    var attempts = state.examAttempts[courseId] || [];
    if (!attempts.length) return null;
    return attempts.reduce(function (best, a) { return (!best || a.scorePct > best.scorePct) ? a : best; }, null);
  }

  function hasPassedExam(courseId) {
    var best = bestExamAttempt(courseId);
    return !!(best && best.passed);
  }

  function recordExamAttempt(courseId, attempt) {
    attempt.at = nowISO();
    attempt.id = uid('attempt');
    state.examAttempts[courseId] = state.examAttempts[courseId] || [];
    state.examAttempts[courseId].unshift(attempt);
    if (syncing()) bg(dbInsertExamAttempt(state.user.id, courseId, attempt), 'examAttempt');
    if (attempt.passed) addXP(XP_RULES.examPass, 'Certification exam passed');
    touchStreak();
    persist();
    return attempt;
  }

  function recordPracticalAttempt(courseId, attempt) {
    attempt.at = nowISO();
    attempt.id = uid('practical');
    state.practicalAttempts[courseId] = state.practicalAttempts[courseId] || [];
    state.practicalAttempts[courseId].unshift(attempt);
    if (syncing()) bg(dbInsertPracticalAttempt(state.user.id, courseId, attempt), 'practicalAttempt');
    if (attempt.passed) addXP(XP_RULES.examPass, 'Practical evaluation passed');
    persist();
    return attempt;
  }

  function bestPracticalAttempt(courseId) {
    var attempts = state.practicalAttempts[courseId] || [];
    if (!attempts.length) return null;
    return attempts.reduce(function (best, a) { return (!best || a.scorePct > best.scorePct) ? a : best; }, null);
  }

  function hasPassedPractical(courseId) {
    var best = bestPracticalAttempt(courseId);
    return !!(best && best.passed);
  }

  // ---------- Certification status ----------
  // 'locked' | 'not_started' | 'in_progress' | 'ready_for_exam' | 'certified'
  function certStatus(courseDef) {
    if (courseDef.id === 'energy-advisor' && !isEnergyAdvisorUnlocked()) return 'locked';
    var passedExam = hasPassedExam(courseDef.id);
    var needsPractical = !!courseDef.practicalExam;
    var passedPractical = needsPractical ? hasPassedPractical(courseDef.id) : true;
    if (passedExam && passedPractical) return 'certified';
    var pct = courseProgressPercent(courseDef);
    var modsDone = allModulesComplete(courseDef);
    if (modsDone) return 'ready_for_exam';
    if (pct === 0) return 'not_started';
    return 'in_progress';
  }

  function isEnergyAdvisorUnlocked() {
    return hasPassedExam('solar') && hasPassedExam('hvac');
  }

  function certificateId(courseId) {
    var prefix = courseId === 'solar' ? 'NPS' : courseId === 'hvac' ? 'NPH' : 'NEA';
    var seed = (state.user && state.user.email || 'guest') + courseId;
    var hash = 0;
    for (var i = 0; i < seed.length; i++) { hash = (hash * 31 + seed.charCodeAt(i)) >>> 0; }
    return prefix + '-' + (10000 + (hash % 89999));
  }

  // Pull this user's real progress out of Supabase into the in-memory shape
  // the rest of the app already reads synchronously. Called once at boot,
  // right after a session + profile are confirmed.
  function hydrateFromSupabase(userId) {
    return dbFetchUserFullProgress(userId).then(function (rows) {
      COURSES.forEach(function (c) { state.progress[c.id] = { lessonsDone: {}, moduleChecks: {}, labsDone: {} }; });
      rows.lessons.forEach(function (r) {
        var p = courseProgress(r.course_id);
        p.lessonsDone[r.module_id + '::' + r.lesson_id] = r.completed_at;
      });
      rows.checks.forEach(function (r) {
        var p = courseProgress(r.course_id);
        p.moduleChecks[r.module_id] = { scorePct: r.score_pct, passed: r.passed, attempts: r.attempts, lastAt: r.last_at };
      });
      rows.labs.forEach(function (r) {
        var p = courseProgress(r.course_id);
        p.labsDone[r.lab_id] = r.completed_at;
      });
      state.examAttempts = { solar: [], hvac: [], 'energy-advisor': [] };
      rows.exams.forEach(function (r) {
        state.examAttempts[r.course_id] = state.examAttempts[r.course_id] || [];
        state.examAttempts[r.course_id].push({ id: r.id, scorePct: r.score_pct, compliancePct: r.compliance_pct, passed: r.passed, totalQuestions: r.total_questions, correct: r.correct, categoryBreakdown: r.category_breakdown, at: r.at });
      });
      state.practicalAttempts = { 'energy-advisor': [] };
      rows.practicals.forEach(function (r) {
        state.practicalAttempts[r.course_id] = state.practicalAttempts[r.course_id] || [];
        state.practicalAttempts[r.course_id].push({ id: r.id, scorePct: r.score_pct, passed: r.passed, breakdown: r.breakdown, nextStepText: r.next_step_text, at: r.at });
      });
      state.badges = {};
      rows.badges.forEach(function (r) { state.badges[r.badge_id] = { earnedAt: r.earned_at }; });
      persist();
    });
  }

  return {
    get: get,
    reset: reset,
    setUser: setUser,
    hydrateFromSupabase: hydrateFromSupabase,
    isLoggedIn: isLoggedIn,
    touchStreak: touchStreak,
    addXP: addXP,
    awardBadge: awardBadge,
    hasBadge: hasBadge,
    courseProgress: courseProgress,
    markLessonComplete: markLessonComplete,
    isLessonComplete: isLessonComplete,
    recordModuleCheck: recordModuleCheck,
    markLabComplete: markLabComplete,
    moduleLessonStats: moduleLessonStats,
    isModuleComplete: isModuleComplete,
    courseProgressPercent: courseProgressPercent,
    allModulesComplete: allModulesComplete,
    bestExamAttempt: bestExamAttempt,
    hasPassedExam: hasPassedExam,
    recordExamAttempt: recordExamAttempt,
    recordPracticalAttempt: recordPracticalAttempt,
    bestPracticalAttempt: bestPracticalAttempt,
    hasPassedPractical: hasPassedPractical,
    certStatus: certStatus,
    isEnergyAdvisorUnlocked: isEnergyAdvisorUnlocked,
    certificateId: certificateId,
    persist: persist,
    XP_RULES: XP_RULES
  };
})();
