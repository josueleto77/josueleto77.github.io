/* ============================================================
   NEXIS POWER ACADEMY — App shell, router, and shared helpers
   ============================================================ */

window.NEXIS_BUILD = '20260918d';
console.log('[Nexis Academy] build ' + window.NEXIS_BUILD);

var COURSES = [window.SOLAR_COURSE, window.HVAC_COURSE, window.ENERGY_ADVISOR_COURSE];
function courseById(id) { return COURSES.find(function (c) { return c.id === id; }); }
function examBankFor(courseDef) { return window[courseDef.exam.bankVar] || []; }

// ---------- tiny DOM helpers ----------
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function navigate(hash) { window.location.hash = hash; }
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function initialsOf(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  return ((parts[0] || '')[0] || '').toUpperCase() + ((parts[1] || '')[0] || '').toUpperCase();
}
function pct(n) { return Math.max(0, Math.min(100, Math.round(n))); }
function fmtDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function themeColor(theme) {
  return theme === 'solar' ? 'var(--nexis-orange)' : theme === 'hvac' ? 'var(--nexis-blue)' : 'var(--nexis-charcoal)';
}

var CERT_STATUS_LABEL = {
  locked: 'Locked', not_started: 'Not Started', in_progress: 'In Progress', ready_for_exam: 'Ready for Exam', certified: 'Certified'
};
var CERT_STATUS_PILL = {
  locked: 'pill-gray', not_started: 'pill-gray', in_progress: 'pill-blue', ready_for_exam: 'pill-orange', certified: 'pill-green'
};

// ---------- Router ----------
function currentRoute() {
  var hash = window.location.hash.replace(/^#\/?/, '');
  var parts = hash.split('/').filter(Boolean);
  return parts;
}

var NAV_ITEMS_REP = [
  ['dashboard', 'Dashboard'], ['my-training', 'My Training'], ['certifications', 'Certifications'],
  ['practice', 'Practice Center'], ['coach', 'AI Coach'], ['leaderboard', 'Leaderboard'],
  ['resources', 'Resources'], ['profile', 'Profile']
];
var NAV_ITEMS_MANAGER_EXTRA = [
  ['manager', 'Team']
];
var NAV_ITEMS_ADMIN_EXTRA = [
  ['admin/courses', 'Course Manager'], ['admin/questions', 'Question Bank'], ['admin/certifications', 'Certifications'],
  ['admin/content', 'Content Library'], ['admin/users', 'Users'], ['admin/settings', 'Settings']
];

function renderNav(activeKey) {
  var user = NexisState.get().user;
  if (!user) return '';
  var role = user.role || 'rep';
  var items = NAV_ITEMS_REP.slice();
  if (role === 'manager' || role === 'admin') items = items.concat(NAV_ITEMS_MANAGER_EXTRA);
  var showAdminMenu = role === 'admin';

  var linksHtml = items.map(function (it) {
    var key = it[0], label = it[1];
    var isActive = activeKey === key || (activeKey || '').indexOf(key) === 0;
    return '<button class="topnav-link' + (isActive ? ' active' : '') + '" onclick="navigate(\'' + key + '\')">' + escapeHtml(label) + '</button>';
  }).join('');

  if (showAdminMenu) {
    var adminActive = (activeKey || '').indexOf('admin') === 0;
    var adminItemsHtml = NAV_ITEMS_ADMIN_EXTRA.map(function (it) {
      var isActive = activeKey === it[0];
      return '<button class="nav-dropdown-item' + (isActive ? ' active' : '') + '" onclick="closeAdminMenu();navigate(\'' + it[0] + '\')">' + escapeHtml(it[1]) + '</button>';
    }).join('');
    linksHtml += '<div class="nav-dropdown-wrap">' +
      '<button class="topnav-link' + (adminActive ? ' active' : '') + '" onclick="toggleAdminMenu(event)">Admin ▾</button>' +
      '<div class="nav-dropdown-panel" id="admin-nav-dropdown">' + adminItemsHtml + '</div>' +
    '</div>';
  }

  var items2 = showAdminMenu ? items.concat(NAV_ITEMS_ADMIN_EXTRA) : items;
  var mobileLinksHtml = items2.map(function (it) {
    var key = it[0], label = it[1];
    var isActive = activeKey === key || (activeKey || '').indexOf(key) === 0;
    return '<button class="mobile-menu-link' + (isActive ? ' active' : '') + '" onclick="closeMobileNav();navigate(\'' + key + '\')">' + escapeHtml(label) + '</button>';
  }).join('');

  return (
    '<nav class="topnav"><div class="topnav-inner">' +
      '<div class="topnav-logo" onclick="navigate(\'dashboard\')">' + nexisLogoSVG({ light: true, height: 22 }) + '<small>Academy</small></div>' +
      '<div class="topnav-links">' + linksHtml + '</div>' +
      '<div class="topnav-right">' +
        '<span class="pill pill-orange" style="display:flex;gap:5px;align-items:center;" title="Experience points">✨ ' + (NexisState.get().xp || 0) + ' XP</span>' +
        '<div class="topnav-avatar" title="' + escapeHtml(user.name) + '" onclick="navigate(\'profile\')">' + escapeHtml(initialsOf(user.name)) + '</div>' +
        '<button class="topnav-burger" onclick="toggleMobileNav()" aria-label="Menu">☰</button>' +
      '</div>' +
    '</div>' +
    '<div class="mobile-menu" id="mobile-menu">' + mobileLinksHtml + '</div>' +
    '</nav>'
  );
}
function toggleMobileNav() { var m = qs('#mobile-menu'); if (m) m.classList.toggle('open'); }
function closeMobileNav() { var m = qs('#mobile-menu'); if (m) m.classList.remove('open'); }
function toggleAdminMenu(e) { if (e) e.stopPropagation(); var m = qs('#admin-nav-dropdown'); if (m) m.classList.toggle('open'); }
function closeAdminMenu() { var m = qs('#admin-nav-dropdown'); if (m) m.classList.remove('open'); }
document.addEventListener('click', function (e) {
  var panel = qs('#admin-nav-dropdown');
  if (panel && panel.classList.contains('open') && !panel.parentElement.contains(e.target)) closeAdminMenu();
});

function renderShell(activeKey, bodyHtml) {
  var root = qs('#app-root');
  root.innerHTML = renderNav(activeKey) + '<main class="app-main"><div class="container">' + bodyHtml + '</div></main>' + renderFooter();
  window.scrollTo(0, 0);
}
function renderFooter() {
  return '<footer style="padding:30px 0;text-align:center;color:var(--ink-faint);font-size:.78rem;">Nexis Power Academy — internal training platform · Nexis Power LLC</footer>';
}

function router() {
  var parts = currentRoute();
  var root = qs('#app-root');

  if (!NexisState.isLoggedIn()) {
    root.innerHTML = renderLoginPage();
    bindLoginPage();
    return;
  }
  NexisState.touchStreak();

  var page = parts[0] || 'dashboard';
  if (page === '' || page === 'login') page = 'dashboard';

  if (page === 'dashboard') return renderShell('dashboard', renderDashboardPage());
  if (page === 'my-training') return renderShell('my-training', renderMyTrainingPage());
  if (page === 'certifications') return renderShell('certifications', renderCertificationsPage());
  if (page === 'badges') return renderShell('badges', renderBadgesPage());
  if (page === 'leaderboard') return renderShell('leaderboard', renderLeaderboardPage(parts[1]));
  if (page === 'resources') return renderShell('resources', renderResourcesPage());
  if (page === 'profile') return renderShell('profile', renderProfilePage());

  if (page === 'course') {
    var courseId = parts[1];
    var moduleId = parts[3];
    var sub = parts[4];
    var courseDef = courseById(courseId);
    if (!courseDef) return renderShell('certifications', '<p>Course not found.</p>');
    if (!moduleId) return renderShell('certifications', renderCourseOverviewPage(courseDef));
    if (parts[2] === 'module' && !sub) return renderShell('certifications', renderModulePage(courseDef, moduleId));
    if (sub === 'lesson') return renderShell('certifications', renderLessonPage(courseDef, moduleId, parts[5]));
    if (sub === 'check') return renderShell('certifications', renderModuleCheckPage(courseDef, moduleId));
  }
  if (page === 'exam') {
    var eCourse = courseById(parts[1]);
    if (!eCourse) return renderShell('certifications', '<p>Course not found.</p>');
    if (parts[2] === 'result') return renderShell('certifications', renderExamResultPage(eCourse, parts[3]));
    if (parts[2] === 'practical') return renderShell('certifications', renderPracticalExamPage(eCourse));
    return renderShell('certifications', renderExamPage(eCourse));
  }
  if (page === 'certificate') {
    var cCourse = courseById(parts[1]);
    return renderShell('certifications', renderCertificatePage(cCourse));
  }
  if (page === 'practical-result') {
    var prCourse = courseById(parts[1]);
    if (!prCourse) return renderShell('certifications', '<p>Course not found.</p>');
    return renderShell('certifications', renderPracticalResultPage(prCourse, parts[2]));
  }

  if (page === 'practice') {
    var lab = parts[1];
    if (!lab) return renderShell('practice', renderPracticeHubPage());
    if (lab === 'utility-bill-lab') return renderShell('practice', renderUtilityBillLabPage(parts[2]));
    if (lab === 'btu-lab') return renderShell('practice', renderBtuLabPage());
    if (lab === 'zone-lab') return renderShell('practice', renderZoneLabPage());
    if (lab === 'objection-simulator') return renderShell('practice', renderObjectionSimPage());
    if (lab === 'hvac-roleplay') return renderShell('practice', renderHvacRoleplayPage());
    if (lab === 'mass-save-programs') return renderShell('practice', renderMassSaveProgramsPage(false));
    if (lab === 'energy-advisor-practical') return renderShell('practice', renderPracticalExamPage(courseById('energy-advisor')));
  }

  if (page === 'coach') return renderShell('coach', renderCoachPage());

  if (page === 'manager') {
    if (parts[1] === 'analytics') return renderShell('manager/analytics', renderManagerAnalyticsPage());
    if (parts[1] === 'rep') return renderShell('manager', renderRepDetailPage(parts[2]));
    return renderShell('manager', renderManagerDashboardPage());
  }

  if (page === 'admin') {
    var sub2 = parts[1] || 'courses';
    if (sub2 === 'mass-save' || sub2 === 'content') return renderShell('admin/' + sub2, renderAdminMassSaveOrContentPage(sub2));
    return renderShell('admin/' + sub2, renderAdminPlaceholderPage(sub2));
  }

  return renderShell('dashboard', renderDashboardPage());
}

window.addEventListener('hashchange', function () {
  // Real-backend mode: if the hash changes while we're signed out (e.g. a
  // stale bookmark), just re-run boot() instead of letting router() render
  // an inconsistent page.
  if (window.NEXIS_BACKEND_READY && !NexisState.isLoggedIn()) { boot(); return; }
  router();
});

// ---------- Boot sequence ----------
// Local demo mode (js/config.js empty): unchanged behavior — router() shows
// the existing fake login form the first time, exactly as before.
// Real backend mode (config.js filled in): resolve the Supabase session and
// profile BEFORE ever calling router(), so every page always has real user
// data to read synchronously.
function boot() {
  var backendOn = initSupabase();
  window.NEXIS_BACKEND_READY = backendOn;
  if (!backendOn) { router(); return; }

  var root = qs('#app-root');
  root.innerHTML = '<div class="flex-center" style="min-height:100vh;"><p class="muted">Loading Nexis Power Academy…</p></div>';

  // supabase-js resolves any access_token/refresh_token (or PKCE `code`) it
  // finds in the current URL — left over from an email confirmation or
  // password-recovery link — as part of getSession() below. Once that's
  // done we scrub those params from the address bar so they never leak
  // into the app's own hash-based router.
  authGetSession().then(function (res) {
    cleanAuthParamsFromUrl();
    var session = res.data && res.data.session;
    if (!session) { showAuthGate('signin'); return; }
    proceedPostAuth(session);
  });
}
function cleanAuthParamsFromUrl() {
  var hasAuthHash = /access_token=|refresh_token=|type=signup|type=recovery|type=invite/.test(window.location.hash);
  var hasAuthQuery = /[?&]code=/.test(window.location.search);
  if (hasAuthHash || hasAuthQuery) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

function proceedPostAuth(session) {
  dbFetchMyProfile(session.user.id).then(function (r) {
    if (!r.data) { showNotInvitedGate(session); return; }
    var p = r.data;
    NexisState.setUser({ id: p.id, name: p.name, email: p.email, role: p.role, initials: initialsOf(p.name) });
    NexisState.hydrateFromSupabase(p.id).then(router, router);
  }, function () { showAuthGate('signin'); });
}

function showAuthGate(mode) {
  var root = qs('#app-root');
  root.innerHTML = renderAuthGatePage(mode || 'signin');
  bindAuthGatePage(mode || 'signin');
}
function showNotInvitedGate(session) {
  var root = qs('#app-root');
  root.innerHTML = renderNotInvitedPage(session.user.email);
  bindNotInvitedPage();
}

window.addEventListener('DOMContentLoaded', function () {
  boot();
});
