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
// emailRedirectTo: without this, Supabase sends the confirmation link to
// whatever "Site URL" is set in the project's Auth settings (often blank
// or a placeholder), not back to this actual app. Add this exact origin +
// path to Supabase → Authentication → URL Configuration → Redirect URLs,
// or Supabase silently falls back to the default Site URL instead.
function academyBaseUrl() {
  return window.location.origin + window.location.pathname;
}
function authSignUp(email, password, name) {
  return sb.auth.signUp({ email: email, password: password, options: { data: { name: name }, emailRedirectTo: academyBaseUrl() } });
}
function authSignIn(email, password) {
  return sb.auth.signInWithPassword({ email: email, password: password });
}
function authSignOut() {
  return sb.auth.signOut();
}
// Works for any email, invited or not, without needing to be signed in as
// that user — Supabase's GoTrue never reveals whether the address actually
// has an account, so the caller always shows the same generic message.
// This lets an admin trigger it for someone else's email too (Admin → Users).
function authResetPassword(email) {
  return sb.auth.resetPasswordForEmail(email, { redirectTo: academyBaseUrl() });
}
// Admin-only: changes a rep's login email via the admin-update-email Edge
// Function (needs the service role key, so it can't run directly in the browser).
function dbAdminUpdateEmail(userId, newEmail) {
  return sb.functions.invoke('admin-update-email', { body: { userId: userId, newEmail: newEmail } });
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
// Admin-only: whitelists the email AND sends a real invitation email via
// the invite-rep Edge Function (Supabase Auth's own email service --
// no third-party provider). dbCreateInvite above still exists for direct
// inserts, but the UI uses this so invited reps actually get an email.
function dbInviteRep(email, role, teamId, classification) {
  return sb.functions.invoke('invite-rep', { body: { email: email, role: role, teamId: teamId || null, classification: classification || null } });
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

// ---------------- Leaderboard (every signed-in user can read this) ----------------
function dbLeaderboard(scope) {
  return sb.rpc('leaderboard', { p_scope: scope || 'week' });
}

// ---------------- Onboarding: rep-editable intake ----------------
// onboarding_profile always exists by the time a rep can sign in (created by
// the on_profile_created_onboarding trigger), so this is always an UPDATE,
// never an upsert -- avoids ever depending on an INSERT policy for it.
function dbFetchOnboardingProfile(userId) {
  return sb.from('onboarding_profile').select('*').eq('user_id', userId).maybeSingle();
}
function dbUpdateOnboardingProfile(userId, patch) {
  patch.updated_at = new Date().toISOString();
  // .select() forces PostgREST to return the updated row (or an empty array)
  // instead of null — without it, an UPDATE that RLS silently matches zero
  // rows on comes back as success with no error and no row, which looked to
  // the rep exactly like clicking Submit did nothing.
  return sb.from('onboarding_profile').update(patch).eq('user_id', userId).select();
}

// ---------------- Onboarding: admin/manager-only classification + pipeline status ----------------
// A rep can SELECT their own row (to see their status) but RLS blocks any
// write from a non-staff account, so this is the one place classification
// and "ready to sell" can be set -- never from the rep-facing UI.
function dbFetchOnboardingAdmin(userId) {
  return sb.from('onboarding_admin').select('*').eq('user_id', userId).maybeSingle();
}
function dbListOnboardingAdmin() {
  return sb.from('onboarding_admin').select('*');
}
function dbListAllOnboardingProfiles() {
  return sb.from('onboarding_profile').select('*');
}
function dbUpdateOnboardingAdmin(userId, patch) {
  patch.updated_at = new Date().toISOString();
  return sb.from('onboarding_admin').update(patch).eq('user_id', userId);
}

// ---------------- Onboarding: document / policy-acknowledgment checklist ----------------
function dbListOnboardingDocuments(userId) {
  return sb.from('onboarding_documents').select('*').eq('user_id', userId);
}
function dbListAllOnboardingDocuments() {
  return sb.from('onboarding_documents').select('*');
}
function dbMarkOnboardingDocSubmitted(userId, docKey) {
  return sb.from('onboarding_documents').upsert(
    { user_id: userId, doc_key: docKey, status: 'received', received_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,doc_key' }
  );
}
function dbSetOnboardingDocStatus(userId, docKey, status, verifierId, note) {
  var patch = { user_id: userId, doc_key: docKey, status: status, updated_at: new Date().toISOString(), note: note || null };
  if (status === 'verified' || status === 'rejected') { patch.verified_by = verifierId; patch.verified_at = new Date().toISOString(); }
  return sb.from('onboarding_documents').upsert(patch, { onConflict: 'user_id,doc_key' });
}

// ---------------- Onboarding: DocuSeal e-signature integration ----------------
// The DocuSeal API key never touches the browser -- this just invokes the
// docuseal-send Edge Function (which holds that secret) over the caller's
// own authenticated Supabase session.
function dbSendForSignature(userId, docKey) {
  return sb.functions.invoke('docuseal-send', { body: { userId: userId, docKey: docKey } });
}
function dbListDocusealTemplates() {
  return sb.from('docuseal_templates').select('*');
}
function dbUpsertDocusealTemplate(docKey, templateId, label) {
  return sb.from('docuseal_templates').upsert(
    { doc_key: docKey, template_id: templateId, label: label || null, updated_at: new Date().toISOString() },
    { onConflict: 'doc_key' }
  );
}

// ---------------- Onboarding: HR/admin task queue ----------------
// Fire-and-forget insert; a partial unique index (user_id, task_type where
// status='open') means a duplicate simply fails with a conflict, which the
// caller ignores -- this lets a rep's own client open a de-duplicated
// classification-review task without ever being able to SELECT the queue.
function dbOpenOnboardingTask(userId, taskType, title, detail, urgency, createdBy) {
  return sb.from('onboarding_tasks').insert({ user_id: userId, task_type: taskType, title: title, detail: detail || null, urgency: urgency || 'normal', created_by: createdBy || userId });
}
function dbListOpenOnboardingTasks() {
  return sb.from('onboarding_tasks').select('*').eq('status', 'open').order('created_at', { ascending: false });
}
function dbResolveOnboardingTask(taskId, resolverId) {
  return sb.from('onboarding_tasks').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: resolverId }).eq('id', taskId);
}
// Best-effort: emails every admin via HighLevel about a just-opened task.
// The onboarding_tasks row (already inserted by dbOpenOnboardingTask) stays
// the source of truth -- callers should .catch(function(){}) this the same
// way they already do for dbLogOnboardingAudit.
function dbNotifyNewTask(taskType, title, detail, urgency, repName) {
  return sb.functions.invoke('notify-new-task', { body: { taskType: taskType, title: title, detail: detail || null, urgency: urgency || 'normal', repName: repName || null } });
}

// ---------------- Onboarding: audit trail ----------------
function dbLogOnboardingAudit(userId, action, actorId, result) {
  return sb.from('onboarding_audit_log').insert({ user_id: userId, action: action, actor: actorId, result: result || null });
}
function dbListOnboardingAudit(userId) {
  var q = sb.from('onboarding_audit_log').select('*').order('at', { ascending: false }).limit(100);
  return userId ? q.eq('user_id', userId) : q;
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
window.authResetPassword = authResetPassword;
window.dbAdminUpdateEmail = dbAdminUpdateEmail;
window.authOnChange = authOnChange;
window.dbFetchMyProfile = dbFetchMyProfile;
window.dbUpdateProfile = dbUpdateProfile;
window.dbCreateInvite = dbCreateInvite;
window.dbListInvites = dbListInvites;
window.dbInviteRep = dbInviteRep;
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
window.dbFetchOnboardingProfile = dbFetchOnboardingProfile;
window.dbUpdateOnboardingProfile = dbUpdateOnboardingProfile;
window.dbFetchOnboardingAdmin = dbFetchOnboardingAdmin;
window.dbListOnboardingAdmin = dbListOnboardingAdmin;
window.dbListAllOnboardingProfiles = dbListAllOnboardingProfiles;
window.dbUpdateOnboardingAdmin = dbUpdateOnboardingAdmin;
window.dbListOnboardingDocuments = dbListOnboardingDocuments;
window.dbListAllOnboardingDocuments = dbListAllOnboardingDocuments;
window.dbMarkOnboardingDocSubmitted = dbMarkOnboardingDocSubmitted;
window.dbSetOnboardingDocStatus = dbSetOnboardingDocStatus;
window.dbSendForSignature = dbSendForSignature;
window.dbListDocusealTemplates = dbListDocusealTemplates;
window.dbUpsertDocusealTemplate = dbUpsertDocusealTemplate;
window.dbOpenOnboardingTask = dbOpenOnboardingTask;
window.dbListOpenOnboardingTasks = dbListOpenOnboardingTasks;
window.dbResolveOnboardingTask = dbResolveOnboardingTask;
window.dbNotifyNewTask = dbNotifyNewTask;
window.dbLogOnboardingAudit = dbLogOnboardingAudit;
window.dbListOnboardingAudit = dbListOnboardingAudit;
