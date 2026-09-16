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

  function addXP(amount, reason) {
    state.xp += amount;
    state.xpLog.unshift({ amount: amount, reason: reason, at: nowISO() });
    if (state.xpLog.length > 200) state.xpLog.length = 200;
    persist();
  }

  function awardBadge(badgeId) {
    if (state.badges[badgeId]) return false;
    state.badges[badgeId] = { earnedAt: nowISO() };
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
    p.moduleChecks[moduleId] = { scorePct: scorePct, passed: passed, attempts: (prev ? prev.attempts : 0) + 1, lastAt: nowISO() };
    if (passed) addXP(XP_RULES.knowledgeCheck, 'Knowledge check passed');
    touchStreak();
    persist();
  }

  function markLabComplete(courseId, labId) {
    var p = courseProgress(courseId);
    if (!p.labsDone[labId]) {
      p.labsDone[labId] = nowISO();
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

  return {
    get: get,
    reset: reset,
    setUser: setUser,
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
