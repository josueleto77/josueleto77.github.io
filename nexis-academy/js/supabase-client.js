/* ============================================================
   Nexis Power Academy — Supabase client + thin data-access layer.
   Every other file that needs the database goes through the
   functions here rather than calling `sb` directly, so the real
   backend can be swapped later without touching page code.
   ============================================================ */

var sb = null;
var NEXIS_BACKEND_READY = false;

function initSupabase() {
  var cfg = window.NEXIS_SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey) {
    console.warn('Nexis Academy: Supabase is not configured (js/config.js is empty). Running in local-only demo mode.');
    return false;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Nexis Academy: supabase-js failed to load from CDN.');
    return false;
  }
  sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  NEXIS_BACKEND_READY = true;
  return true;
}

// ---------------- Auth ----------------
function authSignUp(email, password, name) {
  return sb.auth.signUp({ email: email, password: password, options: { data: { name: name } } });
}
function authSignIn(email, password) {
  return sb.auth.signInWithPassword({ email: email, password: password });
}
function authSignOut() {
  return sb.auth.signOut();
}
function authGetSession() {
  return sb.auth.getSession();
}
function authOnChange(cb) {
  return sb.auth.onAuthStateChange(cb);
}

// ---------------- Profile ----------------
function dbFetchMyProfile(userId) {
  return sb.from('profiles').select('*').eq('id', userId).maybeSingle();
}
function dbUpdateProfile(userId, patch) {
  return sb.from('profiles').update(patch).eq('id', userId);
}

// ---------------- Invites (admin only, enforced by RLS) ----------------
function dbCreateInvite(email, role, teamId, invitedBy) {
  return sb.from('invites').insert({ email: email.toLowerCase().trim(), role: role, team_id: teamId || null, invited_by: invitedBy });
}
function dbListInvites() {
  return sb.from('invites').select('*').order('created_at', { ascending: false });
}

// ---------------- Progress writes (fire-and-forget upserts from state.js) ----------------
function dbUpsertLesson(userId, courseId, moduleId, lessonId, estMinutes) {
  return sb.from('lesson_progress').upsert({ user_id: userId, course_id: courseId, module_id: moduleId, lesson_id: lessonId, est_minutes: estMinutes }, { onConflict: 'user_id,course_id,module_id,lesson_id' });
}
function dbUpsertModuleCheck(userId, courseId, moduleId, scorePct, passed, attempts) {
  return sb.from('module_checks').upsert({ user_id: userId, course_id: courseId, module_id: moduleId, score_pct: scorePct, passed: passed, attempts: attempts, last_at: new Date().toISOString() }, { onConflict: 'user_id,course_id,module_id' });
}
function dbUpsertLab(userId, courseId, labId) {
  return sb.from('lab_progress').upsert({ user_id: userId, course_id: courseId, lab_id: labId }, { onConflict: 'user_id,course_id,lab_id' });
}
function dbInsertExamAttempt(userId, courseId, attempt) {
  return sb.from('exam_attempts').insert({ user_id: userId, course_id: courseId, score_pct: attempt.scorePct, compliance_pct: attempt.compliancePct, passed: attempt.passed, total_questions: attempt.totalQuestions, correct: attempt.correct, category_breakdown: attempt.categoryBreakdown || [] });
}
function dbInsertPracticalAttempt(userId, courseId, attempt) {
  return sb.from('practical_attempts').insert({ user_id: userId, course_id: courseId, score_pct: attempt.scorePct, passed: attempt.passed, breakdown: attempt.breakdown || {}, next_step_text: attempt.nextStepText || '' });
}
function dbAwardBadge(userId, badgeId) {
  return sb.from('badges_earned').upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
}
function dbLogXp(userId, amount, reason) {
  return sb.from('xp_log').insert({ user_id: userId, amount: amount, reason: reason });
}
function dbUpdateProfileStats(userId, patch) {
  return sb.from('profiles').update(patch).eq('id', userId);
}

// ---------------- Manager/Admin reads ----------------
function dbListTeamProfiles() {
  return sb.from('profiles').select('*').order('name');
}
function dbFetchUserFullProgress(userId) {
  return Promise.all([
    sb.from('lesson_progress').select('*').eq('user_id', userId),
    sb.from('module_checks').select('*').eq('user_id', userId),
    sb.from('lab_progress').select('*').eq('user_id', userId),
    sb.from('exam_attempts').select('*').eq('user_id', userId).order('at', { ascending: false }),
    sb.from('practical_attempts').select('*').eq('user_id', userId).order('at', { ascending: false }),
    sb.from('badges_earned').select('*').eq('user_id', userId)
  ]).then(function (r) {
    return { lessons: r[0].data || [], checks: r[1].data || [], labs: r[2].data || [], exams: r[3].data || [], practicals: r[4].data || [], badges: r[5].data || [] };
  });
}

// ---------------- Mass Save program DB (shared, admin-editable) ----------------
function dbListMassSavePrograms() {
  return sb.from('mass_save_programs').select('*').order('program_name');
}
function dbUpsertMassSaveProgram(row) {
  return sb.from('mass_save_programs').upsert(row, { onConflict: 'id' });
}

window.sb = sb;
window.initSupabase = initSupabase;
window.NEXIS_BACKEND_READY = NEXIS_BACKEND_READY;
window.authSignUp = authSignUp;
window.authSignIn = authSignIn;
window.authSignOut = authSignOut;
window.authGetSession = authGetSession;
window.authOnChange = authOnChange;
window.dbFetchMyProfile = dbFetchMyProfile;
window.dbUpdateProfile = dbUpdateProfile;
window.dbCreateInvite = dbCreateInvite;
window.dbListInvites = dbListInvites;
window.dbUpsertLesson = dbUpsertLesson;
window.dbUpsertModuleCheck = dbUpsertModuleCheck;
window.dbUpsertLab = dbUpsertLab;
window.dbInsertExamAttempt = dbInsertExamAttempt;
window.dbInsertPracticalAttempt = dbInsertPracticalAttempt;
window.dbAwardBadge = dbAwardBadge;
window.dbLogXp = dbLogXp;
window.dbUpdateProfileStats = dbUpdateProfileStats;
window.dbListTeamProfiles = dbListTeamProfiles;
window.dbFetchUserFullProgress = dbFetchUserFullProgress;
window.dbListMassSavePrograms = dbListMassSavePrograms;
window.dbUpsertMassSaveProgram = dbUpsertMassSaveProgram;
