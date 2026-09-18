/* ============================================================
   NEXIS ENERGY ADVISOR CERTIFICATION (Advanced / Capstone)
   Locked until Solar + HVAC certifications are both earned.
   Focus: whole-home, consultative diagnosis — not pressure selling.
   ============================================================ */

var ENERGY_ADVISOR_COURSE = {
  id: 'energy-advisor',
  title: 'Nexis Energy Advisor Certification',
  short: 'Energy Advisor',
  icon: '⚡',
  theme: 'advisor',
  tagline: 'The advanced capstone: whole-home diagnosis and consultative energy planning.',
  badgeId: 'cert-advisor',
  requires: ['solar', 'hvac'],
  practicalExam: true,
  exam: { bankVar: 'EA_EXAM_BANK', numQuestions: 60, passPct: 85, complianceMinPct: 85, name: 'Nexis Energy Advisor Advanced Certification Exam' },
  practicalScenario: {
    title: 'Practical Evaluation: The Whole-Home Case',
    homeProfile: [
      '2,200 sq. ft. Massachusetts home',
      'Oil heating, no central AC',
      '$350 average monthly electric bill',
      'Roof is 18 years old',
      'Poor insulation in the attic',
      'Customer plans to buy an EV',
      'Customer wants lower long-term energy costs'
    ],
    instructions: 'Walk through this case exactly as you would with a homeowner. You will be scored on discovery, diagnosis, technical accuracy, compliance, communication, and your next-step recommendation — not on how many services you sell.',
    requiredActions: [
      'Ask discovery questions before recommending anything.',
      'Identify potential issues (roof age, insulation, electrical capacity for EV + HVAC + solar together).',
      'Determine which specialists may need to review the property (roofer, electrician, insulation/weatherization assessor).',
      'Explain possible solution pathways and a realistic sequence.',
      'Avoid overpromising savings, rebates, or timelines.',
      'Recommend a clear, appropriately-scoped next step.'
    ],
    rubric: [
      { key: 'discovery', label: 'Discovery', max: 20, desc: 'Did the advisor ask about usage, fuel, comfort, envelope, electrical capacity, roof, and future plans before recommending anything?' },
      { key: 'diagnosis', label: 'Diagnosis', max: 20, desc: 'Did the advisor correctly identify this as a multi-factor case (envelope + roof + electrical + heating), not a single-product opportunity?' },
      { key: 'technical', label: 'Technical Accuracy', max: 20, desc: 'Were BTU/zoning, solar sizing, and electrical-capacity statements appropriately caveated and consistent with Solar and HVAC training?' },
      { key: 'compliance', label: 'Compliance', max: 20, desc: 'No guaranteed savings, no guaranteed rebate amounts, no roofing/electrical engineering determinations made personally, no outage-backup overpromising.' },
      { key: 'communication', label: 'Communication', max: 10, desc: 'Clear, homeowner-friendly language; no pressure tactics; consultative tone throughout.' },
      { key: 'nextStep', label: 'Next-Step Recommendation', max: 10, desc: 'Did the advisor recommend an appropriately-scoped next step (e.g., weatherization assessment + roof inspection before finalizing solar) rather than closing everything at once?' }
    ],
    passScore: 85,
    maxScore: 100
  },
  modules: [
    {
      id: 'ea-m1', number: 1, title: 'Whole-Home Energy Thinking',
      subtitle: 'Diagnose before you recommend',
      lessons: [{
        id: 'l1', title: 'The customer rarely has just "a solar problem"', estMinutes: 8,
        body: [
          { type: 'p', text: 'A customer does not necessarily have a "solar problem" or an "HVAC problem." They may have one of several underlying problems — and the Energy Advisor’s first job is to diagnose which one before recommending anything.' },
          { type: 'list', title: 'The real problem is usually one (or several) of these', items: [
            'Energy Problem — overall cost or usage is out of line with what the home should need.',
            'Comfort Problem — specific rooms are too hot, too cold, or hard to control.',
            'Building Envelope Problem — insulation and air sealing are undermining everything else.',
            'Roof Problem — condition or age limits what can safely go on the roof.',
            'Electrical Capacity Problem — the panel or service can’t support planned upgrades.',
            'Energy Cost Problem — the bill is high, but for a different root cause than the customer assumes.'
          ]},
          { type: 'diagram', id: 'ea-diagram-problem-map', caption: 'The same customer can present six different underlying problems — diagnose before you recommend.' },
          { type: 'callout', kind: 'compliance', title: 'The core discipline', text: 'The advisor must diagnose before recommending. Jumping straight to a product pitch — solar, a heat pump, or anything else — before understanding the real problem is the single most common mistake at this level.' }
        ]
      }]
    },
    {
      id: 'ea-m2', number: 2, title: 'Home Energy Discovery',
      subtitle: 'What a whole-home discovery conversation covers',
      lessons: [{
        id: 'l1', title: 'The full discovery checklist', estMinutes: 9,
        body: [
          { type: 'list', title: 'Investigate all of these before diagnosing', items: [
            'Electricity usage (current bill, seasonal patterns)',
            'Heating fuel and heating cost',
            'Cooling system (or lack of one)',
            'Comfort problems by room',
            'Insulation and air leakage',
            'Roof age and condition',
            'Electrical service capacity',
            'Future EV plans',
            'Solar interest',
            'Battery interest',
            'Renovation plans',
            'Length of expected home ownership'
          ]},
          { type: 'callout', kind: 'tip', title: 'Why this matters', text: 'Good discovery drives everything downstream: solution mapping, sizing assumptions, and the sequencing of the customer’s roadmap. A shortcut here creates bad recommendations later.' }
        ]
      }]
    },
    {
      id: 'ea-m3', number: 3, title: 'Solution Mapping',
      subtitle: 'Which services deserve further evaluation — not "sell everything"',
      lessons: [{
        id: 'l1', title: 'Reading customer profiles correctly', estMinutes: 10,
        body: [
          { type: 'callout', kind: 'compliance', title: 'The key trained skill', text: 'Do NOT default to recommending every service to every customer. The job is to identify which services deserve further evaluation based on the actual diagnosis.' },
          { type: 'list', title: 'Customer A — high electric bill, old oil furnace, no central AC, roof in good condition', items: [
            'Both heat pump and solar are worth evaluating.',
            'Roof condition is good, so it is not a blocker here.',
            'Discovery should still confirm envelope condition and electrical capacity before finalizing either.'
          ]},
          { type: 'list', title: 'Customer B — new HVAC already installed, old roof, high electricity usage, planning to buy an EV', items: [
            'A roof inspection should happen before solar is proposed.',
            'Electrical capacity should be checked before adding an EV charger and solar together.',
            'Do not re-sell or re-pitch HVAC — it was just installed.'
          ]},
          { type: 'list', title: 'Customer C — solar already installed, poor insulation, cold bedrooms, oil heating', items: [
            'Insulation/weatherization and HVAC zoning are the priority here, not more solar.',
            'Cold bedrooms with existing solar points to an envelope or heating-distribution problem, not an energy-production problem.'
          ]},
          { type: 'p', text: 'Practice these customer profiles in the Practice Center — Solution Mapping lab before your exam.' }
        ]
      }]
    },
    {
      id: 'ea-m4', number: 4, title: 'Solar + HVAC',
      subtitle: 'How electrification changes the numbers',
      lessons: [{
        id: 'l1', title: 'Electrification affects electricity usage', estMinutes: 8,
        body: [
          { type: 'p', text: 'Adding heat pumps may increase electricity consumption while reducing another heating fuel (oil, propane, gas). This changes future solar sizing assumptions.' },
          { type: 'callout', kind: 'compliance', title: 'Sizing order matters', text: 'The advisor must gather accurate current AND anticipated future usage data before assuming a solar system size. Sizing solar before knowing planned electrification (heat pumps, EV charging) leads to an undersized system.' }
        ]
      }]
    },
    {
      id: 'ea-m5', number: 5, title: 'Solar + Roofing',
      subtitle: 'Roof condition matters before solar goes on',
      lessons: [{
        id: 'l1', title: 'When to call in a professional roof review', estMinutes: 7,
        body: [
          { type: 'list', title: 'Key principles', items: [
            'Roof condition matters before solar installation.',
            'Identify when the roof needs professional inspection — age, visible wear, or an upcoming replacement need.',
            'The advisor does NOT make roofing engineering determinations personally — that requires appropriate professional review.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Compliance boundary', text: 'Flag the concern, recommend the specialist review, and do not personally certify roof condition or structural adequacy.' }
        ]
      }]
    },
    {
      id: 'ea-m6', number: 6, title: 'HVAC + Insulation',
      subtitle: 'The building envelope is part of the diagnosis',
      lessons: [{
        id: 'l1', title: 'Envelope conditions affect comfort and heat-loss assumptions', estMinutes: 7,
        body: [
          { type: 'p', text: 'Building-envelope conditions (insulation, air sealing, attic/basement condition) affect comfort and heat-loss assumptions.' },
          { type: 'callout', kind: 'tip', title: 'Use it in the diagnostic conversation', text: 'Insulation and weatherization should be part of the diagnostic conversation before finalizing HVAC zone or load assumptions. A poor envelope can undermine an otherwise correctly sized heat pump — the rooms will still feel uncomfortable.' }
        ]
      }]
    },
    {
      id: 'ea-m7', number: 7, title: 'Solar + Battery',
      subtitle: 'The conceptual role of storage',
      lessons: [{
        id: 'l1', title: 'What battery storage does, at a general level', estMinutes: 6,
        body: [
          { type: 'list', title: 'Conceptual role of a battery', items: [
            'Resilience during outages, when properly configured and sized for the intended circuits.',
            'Demand management — shifting when stored energy is used.',
            'Pairing with solar production to use more self-generated energy.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Compliance boundary', text: 'Product-specific claims must rely on approved company documentation. The advisor should not invent specs or guarantee backup scope without knowing the actual system design.' }
        ]
      }]
    },
    {
      id: 'ea-m8', number: 8, title: 'Electrical Readiness',
      subtitle: 'When to flag a review — not perform one',
      lessons: [{
        id: 'l1', title: 'Recognizing capacity concerns', estMinutes: 7,
        body: [
          { type: 'list', title: 'Watch for these together', items: [
            'Panel limitations',
            'Service upgrade concerns',
            'EV charger plans',
            'Heat pumps',
            'Solar',
            'Battery systems'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Compliance boundary', text: 'Do not train yourself to perform electrical engineering. The advisor’s job is to identify when an electrical review may be needed and flag it for a qualified electrician — not to determine capacity personally.' }
        ]
      }]
    },
    {
      id: 'ea-m9', number: 9, title: 'Consultative Sales Process',
      subtitle: 'The Nexis Energy Advisor framework',
      lessons: [{
        id: 'l1', title: 'DISCOVER → DIAGNOSE → EDUCATE → PRIORITIZE → DESIGN NEXT STEP → PRESENT OPTIONS → VERIFY → CLOSE', estMinutes: 9,
        body: [
          { type: 'list', title: 'The 8-step framework', items: [
            'Discover — full whole-home discovery, not just the product the customer asked about.',
            'Diagnose — identify the real underlying problem(s).',
            'Educate — explain relevant concepts in plain language.',
            'Prioritize — decide what matters most given the diagnosis and the customer’s goals.',
            'Design next step — scope the right next action (assessment, inspection, proposal).',
            'Present options — lay out realistic pathways, not a single hard pitch.',
            'Verify — confirm eligibility, sizing assumptions, and specialist input before finalizing.',
            'Close — close on the appropriate next step, not necessarily the whole project at once.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'The goal', text: 'Recommend the right NEXT STEP. Not necessarily: sell everything immediately. This is explicitly consultative, not pressure-based selling.' }
        ]
      }]
    },
    {
      id: 'ea-m10', number: 10, title: 'Customer Energy Plan',
      subtitle: 'Building a Home Energy Roadmap',
      lessons: [{
        id: 'l1', title: 'A simple, phased roadmap', estMinutes: 8,
        body: [
          { type: 'list', title: 'Example phased roadmap', items: [
            'Phase 1 — Energy Assessment + Weatherization.',
            'Phase 2 — Heat Pump Installation.',
            'Phase 3 — Solar.',
            'Phase 4 — Battery / EV Charger.'
          ]},
          { type: 'diagram', id: 'ea-diagram-roadmap', caption: 'One example sequence — the right order depends on the customer’s specific diagnosis.' },
          { type: 'callout', kind: 'tip', title: 'The sequence is not one-size-fits-all', text: 'A customer with poor insulation should weatherize before finalizing HVAC sizing. A customer with an old roof should inspect/address the roof before solar. A customer with no near-term EV plans doesn’t need an EV-ready panel upgrade prioritized first. Build the roadmap around the specific diagnosis.' },
          { type: 'p', text: 'You are ready for the practical evaluation once you can build a roadmap like this live, for a real customer profile, while explaining your reasoning.' }
        ]
      }]
    }
  ]
};

window.ENERGY_ADVISOR_COURSE = ENERGY_ADVISOR_COURSE;
