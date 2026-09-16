/* Badge definitions. `id` is the persistent key used in NexisState.badges. */
var BADGES = [
  // ---- Certification badges (premium) ----
  { id: 'cert-solar', tier: 'certification', track: 'solar', name: 'Nexis Solar Certified', icon: '☀️', desc: 'Earned by passing the Nexis Residential Solar Sales Certification exam.' },
  { id: 'cert-hvac', tier: 'certification', track: 'hvac', name: 'Nexis HVAC Certified', icon: '❄️', desc: 'Earned by passing the Nexis HVAC & Mini-Split Sales Certification exam.' },
  { id: 'cert-advisor', tier: 'certification', track: 'advisor', name: 'Nexis Energy Advisor', icon: '⚡', desc: 'The advanced capstone: Solar + HVAC certified, plus the Energy Advisor exam and practical evaluation.' },

  // ---- Solar specialist badges ----
  { id: 'spec-utility-bill', tier: 'specialist', track: 'solar', name: 'Utility Bill Specialist', icon: '🧾', desc: 'Completed the Utility Bill Lab for both National Grid and Eversource.' },
  { id: 'spec-solar-fundamentals', tier: 'specialist', track: 'solar', name: 'Solar Fundamentals', icon: '🔆', desc: 'Completed Modules 1–3 of the Solar certification with a passing knowledge check.' },
  { id: 'spec-solar-finance', tier: 'specialist', track: 'solar', name: 'Solar Finance Ready', icon: '💳', desc: 'Passed the Savings, Incentives & Financing knowledge check.' },
  { id: 'spec-d2d-ready', tier: 'specialist', track: 'solar', name: 'D2D Ready', icon: '🚪', desc: 'Completed the Door-to-Door Playbook module and appointment-close drill.' },
  { id: 'spec-solar-objections', tier: 'specialist', track: 'solar', name: 'Solar Objection Specialist', icon: '🛡️', desc: 'Completed all 8 scenarios in the Solar Objection Simulator.' },
  { id: 'spec-solar-compliance', tier: 'specialist', track: 'solar', name: 'Solar Compliance', icon: '✅', desc: 'Passed the Compliance & Accuracy knowledge check with a perfect score.' },

  // ---- HVAC specialist badges ----
  { id: 'spec-heat-pump-fundamentals', tier: 'specialist', track: 'hvac', name: 'Heat Pump Fundamentals', icon: '🌀', desc: 'Completed the Mini-Split Fundamentals and How Heat Pumps Work modules.' },
  { id: 'spec-comfort-zoning', tier: 'specialist', track: 'hvac', name: 'Comfort Zoning', icon: '🏠', desc: 'Completed the Zone Planning Lab across all sample floor plans.' },
  { id: 'spec-btu-fundamentals', tier: 'specialist', track: 'hvac', name: 'BTU Fundamentals', icon: '🌡️', desc: 'Completed the Preliminary BTU Estimator Lab.' },
  { id: 'spec-mass-save-ready', tier: 'specialist', track: 'hvac', name: 'Mass Save Ready', icon: '📗', desc: 'Passed the Mass Save Conversation knowledge check.' },
  { id: 'spec-hvac-objections', tier: 'specialist', track: 'hvac', name: 'HVAC Objection Specialist', icon: '🛡️', desc: 'Completed all 6 HVAC Roleplay Center scenarios.' },

  // ---- Energy Advisor specialist ----
  { id: 'spec-whole-home', tier: 'specialist', track: 'advisor', name: 'Whole-Home Energy Specialist', icon: '🧭', desc: 'Completed all Solution Mapping customer profiles with a passing score.' }
];

function getBadge(id) { return BADGES.find(function (b) { return b.id === id; }); }
window.BADGES = BADGES;
window.getBadge = getBadge;
