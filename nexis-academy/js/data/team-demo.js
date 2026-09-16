/* ============================================================
   Demo team data for the Manager Dashboard / Team Skill Matrix.
   This is a client-side prototype: these are seeded sample teammates,
   not real accounts. A production build would replace this with a
   real roster synced from the backend.
   ============================================================ */

var TEAM_SKILL_LIST = [
  'Solar Fundamentals', 'Utility Bills', 'Solar Finance', 'Solar D2D', 'Solar Objections', 'Solar Compliance',
  'Heat Pumps', 'HVAC Discovery', 'Zoning', 'BTU', 'Mass Save', 'HVAC Objections',
  'Whole-Home Energy', 'Cross-Service Discovery', 'Energy Planning'
];

function seededRand(seed) {
  var x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

var DEMO_TEAM = [
  { id: 'u1', name: 'John Smith', role: 'Solar + HVAC Rep', solarPct: 100, hvacPct: 100, solarCert: true, hvacCert: true, advisorStatus: 'certified', quizAvg: 92, examAvg: 94, trainingHours: 38, lastActivity: '2026-09-15', weakTopics: [] },
  { id: 'u2', name: 'Maria Lopez', role: 'Solar Rep', solarPct: 100, hvacPct: 76, solarCert: true, hvacCert: false, advisorStatus: 'locked', quizAvg: 88, examAvg: 90, trainingHours: 24, lastActivity: '2026-09-14', weakTopics: ['BTU Estimation', 'Mass Save'] },
  { id: 'u3', name: 'David Jones', role: 'HVAC Rep', solarPct: 42, hvacPct: 100, solarCert: false, hvacCert: true, advisorStatus: 'locked', quizAvg: 79, examAvg: 82, trainingHours: 19, lastActivity: '2026-09-10', weakTopics: ['Net Metering', 'Financing'] },
  { id: 'u4', name: 'Amanda Perez', role: 'Solar + HVAC Rep', solarPct: 100, hvacPct: 100, solarCert: true, hvacCert: true, advisorStatus: 'ready', quizAvg: 90, examAvg: 91, trainingHours: 41, lastActivity: '2026-09-16', weakTopics: [] },
  { id: 'u5', name: 'Chris Nguyen', role: 'New Rep', solarPct: 18, hvacPct: 5, solarCert: false, hvacCert: false, advisorStatus: 'locked', quizAvg: 71, examAvg: 0, trainingHours: 4, lastActivity: '2026-09-09', weakTopics: ['Solar Fundamentals', 'Site Qualification'] },
  { id: 'u6', name: 'Priya Patel', role: 'Solar Rep', solarPct: 65, hvacPct: 0, solarCert: false, hvacCert: false, advisorStatus: 'locked', quizAvg: 84, examAvg: 0, trainingHours: 12, lastActivity: '2026-09-13', weakTopics: ['Solar Objections'] },
  { id: 'u7', name: 'Marcus Webb', role: 'D2D Setter', solarPct: 88, hvacPct: 30, solarCert: false, hvacCert: false, advisorStatus: 'locked', quizAvg: 81, examAvg: 0, trainingHours: 15, lastActivity: '2026-09-12', weakTopics: ['Compliance', 'D2D'] }
];

function teamSkillScore(member, skill) {
  var seed = (member.id.charCodeAt(1) + skill.length) * 7.13;
  var base = member.quizAvg / 100;
  var variance = (seededRand(seed) - 0.5) * 0.3;
  var v = Math.max(0.15, Math.min(1, base + variance));
  return Math.round(v * 100);
}

window.DEMO_TEAM = DEMO_TEAM;
window.TEAM_SKILL_LIST = TEAM_SKILL_LIST;
window.teamSkillScore = teamSkillScore;
