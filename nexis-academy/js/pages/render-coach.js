/* ============================================================
   Ask Nexis Coach — searches only approved training content
   (lesson text from the three certification courses) and always
   cites its source. Never invents figures, rules, or promises.
   ============================================================ */

var STOPWORDS = ['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'or', 'in', 'on', 'for', 'what', 'how', 'do', 'does', 'i', 'my', 'you', 'your', 'can', 'should', 'it', 'this', 'that', 'be', 'with', 'as', 'at', 'if', 'not'];
var TIME_SENSITIVE_TRIGGERS = ['rebate', 'tax credit', 'warranty', 'guarantee', 'price', 'cost', 'apr', 'interest rate', 'smart program', 'net metering rate', 'incentive amount'];

var COACH_INDEX = null;
function buildCoachIndex() {
  if (COACH_INDEX) return COACH_INDEX;
  var chunks = [];
  COURSES.forEach(function (course) {
    course.modules.forEach(function (mod) {
      mod.lessons.forEach(function (lesson) {
        var text = lesson.body.map(function (b) {
          if (b.type === 'p' || b.type === 'say') return b.text;
          if (b.type === 'list') return (b.title || '') + ' ' + b.items.join(' ');
          if (b.type === 'callout') return (b.title || '') + ' ' + b.text;
          if (b.type === 'table') return (b.title || '') + ' ' + b.rows.map(function (r) { return r.join(' '); }).join(' ');
          return '';
        }).join(' ');
        chunks.push({
          courseTitle: course.short, courseId: course.id, moduleNumber: mod.number, moduleTitle: mod.title,
          lessonTitle: lesson.title, text: text, textLower: text.toLowerCase()
        });
      });
    });
  });
  COACH_INDEX = chunks;
  return chunks;
}
function tokenize(s) {
  return (s.toLowerCase().match(/[a-z0-9%]+/g) || []).filter(function (w) { return w.length > 2 && STOPWORDS.indexOf(w) === -1; });
}
function searchCoach(query) {
  var idx = buildCoachIndex();
  var terms = tokenize(query);
  if (!terms.length) return [];
  var scored = idx.map(function (chunk) {
    var score = 0;
    terms.forEach(function (t) { if (chunk.textLower.indexOf(t) !== -1) score++; });
    return { chunk: chunk, score: score };
  }).filter(function (s) { return s.score > 0; });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, 3);
}
function snippetFor(chunk, terms) {
  var text = chunk.text;
  var lower = text.toLowerCase();
  var pos = -1;
  terms.forEach(function (t) { var p = lower.indexOf(t); if (p !== -1 && (pos === -1 || p < pos)) pos = p; });
  if (pos === -1) pos = 0;
  var start = Math.max(0, pos - 80);
  var snippet = (start > 0 ? '…' : '') + text.slice(start, start + 260) + (text.length > start + 260 ? '…' : '');
  return snippet;
}

function renderCoachPage() {
  window._coachHistory = window._coachHistory || [];
  var suggestions = ['What is net metering?', 'How do I explain the whole-home vs partial-home Mass Save rebate?', 'What is the LAER objection framework?', 'How do I estimate BTU load for a bedroom?', 'What counts as a Delivery charge on a National Grid bill?'];
  return (
    '<div class="section-head"><div><span class="eyebrow">Ask Nexis Coach</span><h1>Your training content assistant</h1><p class="mb-0">Answers only from approved Nexis Power Academy training content, with a source citation every time.</p></div></div>' +
    '<div class="tag-row mt-8 mb-16">' + suggestions.map(function (s) { return '<button class="btn btn-outline btn-sm" onclick="askCoachPreset(' + "'" + s.replace(/'/g, "\\'") + "'" + ')">' + escapeHtml(s) + '</button>'; }).join('') + '</div>' +
    '<div class="card"><div class="flex gap-10"><input type="text" id="coach-input" placeholder="Ask about any certification topic…" style="flex:1;padding:12px 14px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;" onkeydown="if(event.key===\'Enter\')askCoach();"><button class="btn btn-primary" onclick="askCoach()">Ask</button></div></div>' +
    '<div id="coach-thread" class="mt-16 stack">' + window._coachHistory.map(renderCoachTurn).join('') + '</div>'
  );
}
function askCoachPreset(q) { qs('#coach-input').value = q; askCoach(); }
function askCoach() {
  var input = qs('#coach-input');
  var query = input.value.trim();
  if (!query) return;
  input.value = '';
  var results = searchCoach(query);
  var terms = tokenize(query);
  var isTimeSensitive = TIME_SENSITIVE_TRIGGERS.some(function (t) { return query.toLowerCase().indexOf(t) !== -1; });
  var turn = { query: query, results: [], note: null };
  if (!results.length) {
    turn.note = 'I couldn’t find approved training content that directly answers this. I don’t invent rebate values, tax rules, finance terms, warranty terms, equipment specs, or program details — please check the Mass Save Programs page or ask your manager for current, verified information.';
  } else {
    turn.results = results.map(function (r) { return { source: r.chunk.courseTitle + ' Certification — Module ' + r.chunk.moduleNumber + ': ' + r.chunk.moduleTitle + ' → ' + r.chunk.lessonTitle, snippet: snippetFor(r.chunk, terms) }; });
    if (isTimeSensitive) turn.note = 'This topic involves figures that change over time (rebates, incentives, tax rules, or pricing). The excerpt above reflects the most recently approved training content — always verify current numbers in the Mass Save Programs page before quoting a customer.';
  }
  window._coachHistory.unshift(turn);
  renderShell('coach', renderCoachPage());
}
function renderCoachTurn(turn) {
  return '<div class="card">' +
    '<p style="font-weight:700;">You asked: “' + escapeHtml(turn.query) + '”</p>' +
    turn.results.map(function (r) {
      return '<div class="callout tip mt-8"><p class="mb-0">' + escapeHtml(r.snippet) + '</p></div>' +
        '<p class="tiny muted mt-8">📌 Source: ' + escapeHtml(r.source) + '</p>';
    }).join('') +
    (turn.note ? '<div class="callout compliance mt-8"><p class="mb-0">' + escapeHtml(turn.note) + '</p></div>' : '') +
  '</div>';
}
