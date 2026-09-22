/* ============================================================
   Core pages: Login, Dashboard, Certifications, Badges, Leaderboard,
   Resources, Profile
   ============================================================ */

// ---------------- Login ----------------
function renderLoginPage() {
  return (
    '<div class="login-wrap">' +
      '<div class="login-visual">' +
        '<div style="margin-bottom:34px;">' + nexisLogoSVG({ light: true, height: 30 }) + '</div>' +
        '<div class="pill pill-orange" style="margin-bottom:18px;width:fit-content;">Nexis Power Academy</div>' +
        '<h1 style="color:#fff;font-size:2.2rem;max-width:480px;">BUILD YOUR ENERGY EXPERTISE.</h1>' +
        '<p style="max-width:440px;font-size:1.02rem;">Train. Practice. Certify. Grow.</p>' +
        '<div style="margin-top:36px;display:flex;gap:26px;flex-wrap:wrap;">' +
          energyIconStat('☀️', 'Solar Sales Certification') +
          energyIconStat('❄️', 'HVAC & Mini-Split Certification') +
          energyIconStat('⚡', 'Energy Advisor — Advanced') +
        '</div>' +
        '<p class="tiny" style="margin-top:48px;color:#9AAAB6;">Knowledge builds confidence. Confidence builds trust.</p>' +
      '</div>' +
      '<div class="login-form-side">' +
        '<div class="login-card">' +
          '<h2>Sign in</h2>' +
          '<p class="small muted" style="margin-bottom:24px;">Access your Nexis Power Academy training.</p>' +
          '<form id="login-form">' +
            '<div class="field"><label>Full name</label><input type="text" id="li-name" placeholder="Jordan Rivera" required></div>' +
            '<div class="field"><label>Email</label><input type="email" id="li-email" placeholder="you@nexispower.com" required></div>' +
            '<div class="field"><label>Password</label><input type="password" id="li-pass" placeholder="••••••••" required></div>' +
            '<div class="field"><label>Role (demo)</label><select id="li-role"><option value="rep">Sales Representative</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>' +
            '<button type="submit" class="btn btn-primary btn-block">Sign In</button>' +
          '</form>' +
          '<div class="flex-between mt-16"><a class="tiny muted" href="#" onclick="return false;">Forgot password</a><span class="tiny muted">Prototype — local session only</span></div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
function energyIconStat(icon, label) {
  return '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:1.4rem;">' + icon + '</span><span class="small" style="color:#D7E0E6;">' + escapeHtml(label) + '</span></div>';
}
function bindLoginPage() {
  var form = qs('#login-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = qs('#li-name').value.trim() || 'Nexis Rep';
    var email = qs('#li-email').value.trim() || 'rep@nexispower.com';
    var role = qs('#li-role').value;
    NexisState.setUser({ name: name, email: email, role: role, initials: initialsOf(name) });
    navigate('dashboard');
  });
}

// ---------------- Real auth (Supabase-backed sign in / accept-invite) ----------------
function renderAuthGatePage(mode) {
  var isSignup = mode === 'signup';
  return (
    '<div class="login-wrap">' +
      '<div class="login-visual">' +
        '<div style="margin-bottom:34px;">' + nexisLogoSVG({ light: true, height: 30 }) + '</div>' +
        '<div class="pill pill-orange" style="margin-bottom:18px;width:fit-content;">Nexis Power Academy</div>' +
        '<h1 style="color:#fff;font-size:2.2rem;max-width:480px;">BUILD YOUR ENERGY EXPERTISE.</h1>' +
        '<p style="max-width:440px;font-size:1.02rem;">Train. Practice. Certify. Grow.</p>' +
        '<p class="tiny" style="margin-top:48px;color:#9AAAB6;">Knowledge builds confidence. Confidence builds trust.</p>' +
      '</div>' +
      '<div class="login-form-side">' +
        '<div class="login-card">' +
          (isSignup ? (
            '<h2>Create your account</h2>' +
            '<p class="small muted" style="margin-bottom:24px;">Only works if a Nexis Power admin has already invited this email.</p>' +
            '<form id="auth-form">' +
              '<div class="field"><label>Full name</label><input type="text" id="au-name" required></div>' +
              '<div class="field"><label>Work email</label><input type="email" id="au-email" placeholder="you@nexispower.com" required></div>' +
              '<div class="field"><label>Password</label><input type="password" id="au-pass" minlength="8" required></div>' +
              '<div class="field"><label>Confirm password</label><input type="password" id="au-pass2" minlength="8" required></div>' +
              '<div id="auth-error" class="callout compliance" style="display:none;margin-bottom:16px;"></div>' +
              '<button type="submit" class="btn btn-primary btn-block">Create Account</button>' +
            '</form>' +
            '<p class="tiny muted mt-16">Already have an account? <a href="#" onclick="showAuthGate(\'signin\');return false;">Sign in</a></p>'
          ) : (
            '<h2>Sign in</h2>' +
            '<p class="small muted" style="margin-bottom:24px;">Access your Nexis Power Academy training.</p>' +
            '<form id="auth-form">' +
              '<div class="field"><label>Email</label><input type="email" id="au-email" placeholder="you@nexispower.com" required></div>' +
              '<div class="field"><label>Password</label><input type="password" id="au-pass" required></div>' +
              '<div id="auth-error" class="callout compliance" style="display:none;margin-bottom:16px;"></div>' +
              '<button type="submit" class="btn btn-primary btn-block">Sign In</button>' +
            '</form>' +
            '<p class="tiny muted mt-16">Were you invited by your admin? <a href="#" onclick="showAuthGate(\'signup\');return false;">Create your account</a></p>'
          )) +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
function authError(msg) { var el = qs('#auth-error'); if (el) { el.style.display = 'block'; el.textContent = msg; } }
function bindAuthGatePage(mode) {
  var form = qs('#auth-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    var email = qs('#au-email').value.trim();
    var pass = qs('#au-pass').value;

    if (mode === 'signup') {
      var name = qs('#au-name').value.trim();
      var pass2 = qs('#au-pass2').value;
      if (pass !== pass2) { authError('Passwords do not match.'); submitBtn.disabled = false; return; }
      authSignUp(email, pass, name).then(function (res) {
        if (res.error) { authError(res.error.message); submitBtn.disabled = false; return; }
        if (!res.data.session) {
          authError('Account created. Check your email to confirm it, then sign in.');
          submitBtn.disabled = false;
          return;
        }
        dbFetchMyProfile(res.data.user.id).then(function (r) {
          if (!r.data) {
            authError('This email hasn’t been invited yet. Ask your Nexis Power admin to invite ' + email + ', then try again.');
            authSignOut();
            submitBtn.disabled = false;
            return;
          }
          proceedPostAuth({ user: res.data.user });
        });
      });
    } else {
      authSignIn(email, pass).then(function (res) {
        if (res.error) { authError(res.error.message); submitBtn.disabled = false; return; }
        proceedPostAuth({ user: res.data.user });
      });
    }
  });
}

function renderNotInvitedPage(email) {
  return (
    '<div class="flex-center" style="min-height:100vh;padding:20px;">' +
      '<div class="card text-center" style="max-width:480px;">' +
        '<div style="margin-bottom:18px;">' + nexisLogoSVG({ height: 26 }) + '</div>' +
        '<h2>Your email isn’t invited yet</h2>' +
        '<p class="small">Signed in as <strong>' + escapeHtml(email) + '</strong>, but no Nexis Power admin has invited this address to the Academy.</p>' +
        '<p class="small muted">Ask your admin to invite you from Admin → Users, then sign out and back in.</p>' +
        '<button class="btn btn-outline mt-16" id="not-invited-signout">Sign Out</button>' +
      '</div>' +
    '</div>'
  );
}
function bindNotInvitedPage() {
  var btn = qs('#not-invited-signout');
  if (btn) btn.addEventListener('click', function () { authSignOut().then(function () { location.reload(); }); });
}

// ---------------- Set password (invited reps land here via the invite email's link) ----------------
function renderSetPasswordPage(email) {
  return (
    '<div class="flex-center" style="min-height:100vh;padding:20px;">' +
      '<div class="card" style="max-width:420px;width:100%;">' +
        '<div style="margin-bottom:14px;">' + nexisLogoSVG({ height: 24 }) + '</div>' +
        '<h2>Welcome to Nexis Power!</h2>' +
        '<p class="small muted" style="margin-bottom:20px;">Signed in as <strong>' + escapeHtml(email) + '</strong>. Set a password to finish creating your account.</p>' +
        '<form id="setpw-form">' +
          '<div class="field"><label>Full Name</label><input type="text" id="setpw-name" required></div>' +
          '<div class="field"><label>New Password</label><input type="password" id="setpw-pass" minlength="8" required></div>' +
          '<div class="field"><label>Confirm Password</label><input type="password" id="setpw-pass2" minlength="8" required></div>' +
          '<div id="setpw-error" class="callout compliance" style="display:none;margin-bottom:16px;"></div>' +
          '<button type="submit" class="btn btn-primary btn-block">Set Password &amp; Continue</button>' +
        '</form>' +
      '</div>' +
    '</div>'
  );
}
function bindSetPasswordPage(session) {
  var form = qs('#setpw-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = qs('#setpw-name').value.trim();
    var pass = qs('#setpw-pass').value;
    var pass2 = qs('#setpw-pass2').value;
    var errEl = qs('#setpw-error');
    function showErr(msg) { errEl.style.display = 'block'; errEl.textContent = msg; }
    if (pass !== pass2) { showErr('Passwords do not match.'); return; }
    var submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    sb.auth.updateUser({ password: pass }).then(function (res) {
      if (res.error) { submitBtn.disabled = false; showErr(res.error.message); return; }
      dbUpdateProfile(session.user.id, { name: name }).then(function () { proceedPostAuth(session); }, function () { proceedPostAuth(session); });
    });
  });
}

// ---------------- Dashboard ----------------
function metricsSummary() {
  var st = NexisState.get();
  var certsEarned = COURSES.filter(function (c) { return NexisState.certStatus(c) === 'certified'; }).length;
  var checks = [];
  COURSES.forEach(function (c) {
    var p = NexisState.courseProgress(c.id);
    Object.keys(p.moduleChecks).forEach(function (k) { checks.push(p.moduleChecks[k].scorePct); });
  });
  var avgQuiz = checks.length ? Math.round(checks.reduce(function (a, b) { return a + b; }, 0) / checks.length) : 0;
  return {
    coursesCompleted: certsEarned,
    avgQuiz: avgQuiz,
    certsEarned: certsEarned,
    trainingHours: Math.round((st.trainingMinutes / 60) * 10) / 10,
    streak: st.streak.count,
    xp: st.xp,
    badges: Object.keys(st.badges).length
  };
}

function renderDashboardPage() {
  var user = NexisState.get().user;
  var firstName = (user.name || 'Rep').split(' ')[0];
  var m = metricsSummary();
  var solar = SOLAR_COURSE, hvac = HVAC_COURSE, advisor = ENERGY_ADVISOR_COURSE;
  var solarPct = NexisState.courseProgressPercent(solar);
  var hvacPct = NexisState.courseProgressPercent(hvac);
  var advisorUnlocked = NexisState.isEnergyAdvisorUnlocked();

  return (
    onbDashboardReminderBanner() +
    '<div class="hero-dark">' +
      '<span class="eyebrow" style="color:#FFCB70;">Nexis Power Academy</span>' +
      '<h1 style="color:#fff;">Welcome back, ' + escapeHtml(firstName) + '</h1>' +
      '<p style="max-width:520px;">Continue building your Nexis expertise.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">' +
        '<button class="btn btn-primary" onclick="navigate(\'my-training\')">Continue Training</button>' +
        '<button class="btn btn-outline" style="border-color:rgba(255,255,255,.3);color:#fff;" onclick="navigate(\'certifications\')">View Certifications</button>' +
      '</div>' +
    '</div>' +

    '<div class="section-head mt-32"><div><span class="eyebrow">Training Progress</span><h2>Your certification path</h2></div></div>' +
    '<div class="grid grid-3">' +
      trainingProgressCard(solar, solarPct) +
      trainingProgressCard(hvac, hvacPct) +
      advisorProgressCard(advisorUnlocked) +
    '</div>' +

    '<div class="section-head mt-32"><div><span class="eyebrow">Certification Pathway</span><h2>Level up your Nexis expertise</h2></div></div>' +
    '<div class="card">' + renderCertPathVisual() + '</div>' +

    '<div class="section-head mt-32"><div><span class="eyebrow">Your Stats</span><h2>Performance at a glance</h2></div></div>' +
    '<div class="grid grid-4">' +
      statTile('🎓', m.coursesCompleted, 'Courses Completed') +
      statTile('📝', m.avgQuiz + '%', 'Average Quiz Score') +
      statTile('🏅', m.certsEarned, 'Certifications Earned') +
      statTile('⏱️', m.trainingHours + 'h', 'Training Hours') +
      statTile('🔥', m.streak, 'Day Streak') +
      statTile('✨', m.xp, 'XP') +
      statTile('🥇', m.badges, 'Badges') +
      statTile('⚡', advisorUnlocked ? 'Unlocked' : 'Locked', 'Energy Advisor') +
    '</div>'
  );
}

function trainingProgressCard(courseDef, progressPct) {
  var status = NexisState.certStatus(courseDef);
  return (
    '<div class="card card-hover" style="cursor:pointer;" onclick="navigate(\'course/' + courseDef.id + '\')">' +
      '<div class="flex-between"><span style="font-size:1.6rem;">' + courseDef.icon + '</span>' +
      '<span class="pill ' + CERT_STATUS_PILL[status] + '">' + CERT_STATUS_LABEL[status] + '</span></div>' +
      '<h3 class="mt-16">' + escapeHtml(courseDef.short.toUpperCase()) + '</h3>' +
      '<div class="progress-track mt-8"><div class="progress-fill" style="width:' + progressPct + '%;"></div></div>' +
      '<p class="small mt-8 mb-0">' + progressPct + '% Complete</p>' +
    '</div>'
  );
}
function advisorProgressCard(unlocked) {
  var status = NexisState.certStatus(ENERGY_ADVISOR_COURSE);
  if (!unlocked) {
    return (
      '<div class="card" style="opacity:.88;">' +
        '<div class="flex-between"><span style="font-size:1.6rem;filter:grayscale(1);">⚡</span><span class="pill pill-gray">Locked</span></div>' +
        '<h3 class="mt-16">ENERGY ADVISOR</h3>' +
        '<div class="progress-track mt-8"><div class="progress-fill locked" style="width:100%;"></div></div>' +
        '<p class="small mt-8 mb-0">Complete Solar + HVAC Certifications to unlock.</p>' +
      '</div>'
    );
  }
  return (
    '<div class="card card-hover" style="cursor:pointer;border-color:var(--nexis-orange);" onclick="navigate(\'course/energy-advisor\')">' +
      '<div class="flex-between"><span style="font-size:1.6rem;">⚡</span><span class="pill ' + CERT_STATUS_PILL[status] + '">' + CERT_STATUS_LABEL[status] + '</span></div>' +
      '<h3 class="mt-16">ENERGY ADVISOR</h3>' +
      '<p class="small mt-8" style="color:var(--nexis-orange-2);font-weight:700;">UNLOCKED</p>' +
      '<button class="btn btn-primary btn-sm mt-8" onclick="event.stopPropagation();navigate(\'course/energy-advisor\')">Start Advanced Certification</button>' +
    '</div>'
  );
}
function statTile(icon, value, label) {
  return '<div class="stat-tile"><div class="stat-icon">' + icon + '</div><div class="stat-value">' + value + '</div><div class="stat-label">' + escapeHtml(label) + '</div></div>';
}

function renderCertPathVisual() {
  var solarDone = NexisState.hasPassedExam('solar');
  var hvacDone = NexisState.hasPassedExam('hvac');
  var advisorDone = NexisState.certStatus(ENERGY_ADVISOR_COURSE) === 'certified';
  function node(icon, label, done, theme) {
    var cls = done ? 'badge-medal ' + theme : 'badge-medal locked';
    return '<div class="cert-node"><div class="node-circle ' + cls + '">' + icon + '</div><div class="small" style="font-weight:700;">' + label + '</div></div>';
  }
  return (
    '<div class="cert-path">' +
      node('☀️', 'SOLAR SALES CERTIFIED', solarDone, 'solar') +
      '<span class="cert-connector">+</span>' +
      node('❄️', 'HVAC SALES CERTIFIED', hvacDone, 'hvac') +
      '<span class="cert-connector">=</span>' +
      node('⚡', 'NEXIS ENERGY ADVISOR', advisorDone, 'advisor') +
    '</div>'
  );
}

// ---------------- My Training (all-courses module list) ----------------
function renderMyTrainingPage() {
  var html = '<div class="section-head"><div><span class="eyebrow">My Training</span><h1>Continue where you left off</h1></div></div>';
  COURSES.forEach(function (c) {
    var status = NexisState.certStatus(c);
    var p = NexisState.courseProgressPercent(c);
    html += '<div class="card mt-16">' +
      '<div class="flex-between"><h3>' + c.icon + ' ' + escapeHtml(c.title) + '</h3><span class="pill ' + CERT_STATUS_PILL[status] + '">' + CERT_STATUS_LABEL[status] + '</span></div>' +
      '<div class="progress-track mt-8"><div class="progress-fill" style="width:' + p + '%;"></div></div>' +
      '<div class="flex-between mt-16">' +
        '<span class="small muted">' + p + '% complete · ' + c.modules.length + ' modules</span>' +
        '<button class="btn btn-dark btn-sm" onclick="navigate(\'course/' + c.id + '\')">' + (status === 'locked' ? 'View Requirements' : 'Open Course') + '</button>' +
      '</div>' +
    '</div>';
  });
  return html;
}

// ---------------- Certifications hub ----------------
function certCard(courseDef) {
  var status = NexisState.certStatus(courseDef);
  var p = NexisState.courseProgressPercent(courseDef);
  var locked = status === 'locked';
  var themeCls = courseDef.theme;
  var ctaLabel = status === 'certified' ? 'View Certificate' : status === 'ready_for_exam' ? 'Take Final Exam' : status === 'locked' ? 'Locked' : (p === 0 ? 'Start Certification' : 'Continue');
  var ctaAction = status === 'certified' ? "navigate('certificate/" + courseDef.id + "')" : (status === 'ready_for_exam' ? "navigate('exam/" + courseDef.id + "')" : "navigate('course/" + courseDef.id + "')");
  return (
    '<div class="card' + (locked ? '' : ' card-hover') + '" style="' + (locked ? 'opacity:.85;' : '') + '">' +
      '<div class="badge-medal ' + (locked ? 'locked' : themeCls) + '" style="font-size:30px;">' + courseDef.icon + '</div>' +
      '<h3 class="mt-16">' + escapeHtml(courseDef.title.toUpperCase()) + '</h3>' +
      '<p class="small">' + escapeHtml(courseDef.tagline) + '</p>' +
      '<span class="pill ' + CERT_STATUS_PILL[status] + '">' + CERT_STATUS_LABEL[status] + '</span>' +
      (locked ? '<p class="small mt-16" style="color:var(--ink-faint);">Requirement: Complete Solar and HVAC Certifications</p>' :
        '<div class="progress-track mt-16"><div class="progress-fill" style="width:' + p + '%;"></div></div><p class="tiny muted mt-8">' + p + '% complete</p>') +
      '<button class="btn ' + (locked ? 'btn-outline' : 'btn-primary') + ' btn-block mt-16" ' + (locked ? 'disabled' : 'onclick="' + ctaAction + '"') + '>' + ctaLabel + '</button>' +
    '</div>'
  );
}
function renderCertificationsPage() {
  return (
    '<div class="section-head"><div><span class="eyebrow">Certifications</span><h1>Your Nexis Power certification paths</h1></div></div>' +
    '<div class="card mt-0 mb-0" style="margin-bottom:22px;">' + renderCertPathVisual() + '</div>' +
    '<div class="grid grid-3">' + COURSES.map(certCard).join('') + '</div>'
  );
}

// ---------------- Badges ----------------
function renderBadgesPage() {
  var earned = NexisState.get().badges;
  var cert = BADGES.filter(function (b) { return b.tier === 'certification'; });
  var spec = BADGES.filter(function (b) { return b.tier === 'specialist'; });
  function badgeTile(b) {
    var has = !!earned[b.id];
    var medalClass = has ? (b.tier === 'certification' ? (b.track === 'advisor' ? 'advisor' : b.track) : 'specialist') : 'locked';
    return '<div class="card text-center" style="padding:20px 14px;">' +
      '<div class="badge-medal ' + medalClass + '" style="margin:0 auto 10px;font-size:26px;">' + (has ? b.icon : '🔒') + '</div>' +
      '<div class="small" style="font-weight:700;">' + escapeHtml(b.name) + '</div>' +
      '<div class="tiny muted mt-8">' + escapeHtml(b.desc) + '</div>' +
      (has ? '<div class="tiny mt-8" style="color:#2E8A56;font-weight:700;">Earned ' + fmtDate(earned[b.id].earnedAt) + '</div>' : '') +
    '</div>';
  }
  return (
    '<div class="section-head"><div><span class="eyebrow">Achievements</span><h1>Badges</h1></div></div>' +
    '<h2>Certification Badges</h2><div class="grid grid-3 mt-16">' + cert.map(badgeTile).join('') + '</div>' +
    '<h2 class="mt-32">Specialist Badges</h2><div class="grid grid-auto mt-16">' + spec.map(badgeTile).join('') + '</div>'
  );
}

// ---------------- Leaderboard ----------------
var LEADERBOARD_CACHE = {}; // scope -> rows | 'loading'
function getLeaderboardData(scope, onReadyRerender) {
  if (!window.NEXIS_BACKEND_READY) return null; // caller falls back to demo data
  var cached = LEADERBOARD_CACHE[scope];
  if (cached && cached !== 'loading') return cached;
  if (cached !== 'loading') {
    LEADERBOARD_CACHE[scope] = 'loading';
    dbLeaderboard(scope).then(function (res) {
      LEADERBOARD_CACHE[scope] = res.data || [];
      if (onReadyRerender) onReadyRerender();
    }).catch(function (e) {
      console.error('Loading leaderboard failed', e);
      LEADERBOARD_CACHE[scope] = [];
      if (onReadyRerender) onReadyRerender();
    });
  }
  return null;
}
function renderLeaderboardPage(scope) {
  scope = scope === 'alltime' ? 'alltime' : 'week';
  var user = NexisState.get().user;
  var tabsHtml = '<div class="flex gap-10 mb-16">' +
    '<button class="btn btn-sm ' + (scope === 'week' ? 'btn-dark' : 'btn-outline') + '" onclick="navigate(\'leaderboard/week\')">This week</button>' +
    '<button class="btn btn-sm ' + (scope === 'alltime' ? 'btn-dark' : 'btn-outline') + '" onclick="navigate(\'leaderboard/alltime\')">All-time XP</button>' +
  '</div>';
  var title = scope === 'week' ? 'Top training XP this week' : 'Top training XP all-time';

  var rows, isDemo = false;
  if (window.NEXIS_BACKEND_READY) {
    var real = getLeaderboardData(scope, function () { renderShell('leaderboard', renderLeaderboardPage(scope)); });
    if (!real) {
      return '<div class="section-head"><div><span class="eyebrow">Leaderboard</span><h1>' + title + '</h1></div></div>' + tabsHtml + loadingCard('Loading leaderboard…');
    }
    rows = real.map(function (r) { return { name: r.id === user.id ? r.name + ' (You)' : r.name, xp: r.xp, isMe: r.id === user.id }; });
    if (!rows.some(function (r) { return r.isMe; })) rows.push({ name: user.name + ' (You)', xp: scope === 'week' ? 0 : NexisState.get().xp, isMe: true });
  } else {
    isDemo = true;
    var me = { name: user.name + ' (You)', xp: NexisState.get().xp, isMe: true };
    var demo = DEMO_TEAM.map(function (t) { return { name: t.name, xp: 400 + Math.round(t.quizAvg * 9 + t.trainingHours * 12) }; });
    rows = demo.concat([me]);
  }
  rows.sort(function (a, b) { return b.xp - a.xp; });

  return (
    '<div class="section-head"><div><span class="eyebrow">Leaderboard</span><h1>' + title + '</h1></div></div>' +
    (isDemo ? '<div class="callout tip mb-16"><h4>Demo data</h4><p class="mb-0">Connect Supabase to rank real reps by real training XP.</p></div>' : '') +
    tabsHtml +
    '<div class="card">' +
      (rows.length ? rows.map(function (r, i) {
        return '<div class="flex-between" style="padding:12px 4px;border-bottom:1px solid var(--border);' + (r.isMe ? 'background:rgba(255,165,1,.06);border-radius:10px;' : '') + '">' +
          '<div class="flex" style="align-items:center;gap:12px;"><span class="pill pill-dark" style="min-width:28px;justify-content:center;">' + (i + 1) + '</span><span style="font-weight:' + (r.isMe ? '800' : '600') + ';">' + escapeHtml(r.name) + '</span></div>' +
          '<span class="pill pill-orange">' + r.xp + ' XP</span>' +
        '</div>';
      }).join('') : '<p class="muted mb-0">No training activity yet.</p>') +
    '</div>'
  );
}

// ---------------- Resources ----------------
function renderResourcesPage() {
  var items = [
    { title: 'Nexis Residential Solar Sales Training Manual (source)', tag: 'Solar' },
    { title: 'Nexis Mini-Split Heat Pump Sales Training (source)', tag: 'HVAC' },
    { title: 'Mass Save Program Database (admin-editable)', tag: 'Programs', action: "navigate('practice/mass-save-programs')" },
    { title: 'Compliance Language Guardrails (Do / Do-Not-Say)', tag: 'Compliance' },
    { title: 'LAER Objection Framework Quick Reference', tag: 'Solar' },
    { title: 'Nexis Energy Advisor Consultative Framework', tag: 'Advisor' }
  ];
  return (
    '<div class="section-head"><div><span class="eyebrow">Resources</span><h1>Reference library</h1></div></div>' +
    '<div class="grid grid-2">' + items.map(function (it) {
      return '<div class="card flex-between" ' + (it.action ? 'style="cursor:pointer;" onclick="' + it.action + '"' : '') + '>' +
        '<div><div style="font-weight:700;">' + escapeHtml(it.title) + '</div><span class="pill pill-blue mt-8" style="display:inline-flex;">' + it.tag + '</span></div>' +
        '<span class="muted">→</span></div>';
    }).join('') + '</div>'
  );
}

// ---------------- Profile ----------------
function renderProfilePage() {
  var user = NexisState.get().user;
  var m = metricsSummary();
  return (
    '<div class="section-head"><div><span class="eyebrow">Profile</span><h1>' + escapeHtml(user.name) + '</h1></div></div>' +
    '<div class="grid grid-3">' +
      '<div class="card"><h3>Account</h3><p class="small">Email: ' + escapeHtml(user.email) + '</p><p class="small">Role: ' + escapeHtml(user.role) + '</p>' +
        (window.NEXIS_BACKEND_READY ?
          '<button class="btn btn-outline btn-sm mt-16" onclick="authSignOut().then(function(){location.reload();})">Sign Out</button>' :
          '<button class="btn btn-outline btn-sm mt-16" onclick="if(confirm(\'Reset all local training progress? This cannot be undone.\')){NexisState.reset();location.reload();}">Reset Demo Progress</button>') + '</div>' +
      '<div class="card"><h3>Performance</h3><p class="small">Training hours: ' + m.trainingHours + 'h</p><p class="small">XP: ' + m.xp + '</p><p class="small">Streak: ' + m.streak + ' days</p></div>' +
      '<div class="card"><h3>Certifications</h3>' + COURSES.map(function (c) {
        var s = NexisState.certStatus(c);
        return '<div class="flex-between small" style="padding:6px 0;"><span>' + c.icon + ' ' + c.short + '</span><span class="pill ' + CERT_STATUS_PILL[s] + '">' + CERT_STATUS_LABEL[s] + '</span></div>';
      }).join('') + '</div>' +
    '</div>'
  );
}
