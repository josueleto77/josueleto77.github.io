/* ============================================================
   Interactive Practice Center data: Utility Bill Lab, BTU Estimator,
   Zone Planning Lab, Solar Objection Simulator, HVAC Roleplay Center,
   and the admin-editable Mass Save program database.
   ============================================================ */

// ---------------- Utility Bill Lab ----------------
var UTILITY_BILL_LAB = {
  nationalGrid: {
    name: 'National Grid',
    summary: 'Massachusetts National Grid residential bill: Account Balance, Detail of Current Charges, Payment Information.',
    lineItems: [
      { label: 'Customer Charge', kind: 'delivery', note: 'Fixed daily charge for basic service.' },
      { label: 'Distribution Charge (Dist Chg)', kind: 'delivery', note: 'Cost of delivering electricity locally.' },
      { label: 'Transition Charge', kind: 'delivery', note: 'Covers cost of changing from higher-priced power contracts.' },
      { label: 'Transmission Charge', kind: 'delivery', note: 'Pays for regional delivery of electricity.' },
      { label: 'Energy Efficiency Charge', kind: 'delivery', note: 'Supports energy efficiency programs.' },
      { label: 'Renewable Energy Charge', kind: 'delivery', note: 'Supports renewable energy projects.' },
      { label: 'Net Meter Recovery Charge', kind: 'delivery', note: 'Recovers costs related to net-metering customers.' },
      { label: 'Distributed Solar Charge', kind: 'delivery', note: 'Supports local solar programs/infrastructure.' },
      { label: 'Electric Vehicle Charge', kind: 'delivery', note: 'Funds EV infrastructure programs.' }
    ],
    usageChartNote: 'Electric usage history chart (kWh by month) — this is where annual consumption is found.',
    questions: [
      { q: 'Where on this bill is annual consumption shown?', choices: ['Payment Information box', 'The electric usage history chart (kWh by month)', 'The Account Balance summary', 'The mailing address block'], answerIndex: 1, explain: 'The usage history chart shows monthly kWh — add 12 months for annual consumption.' },
      { q: 'Which number on this bill represents kWh usage for the current period?', choices: ['The "Amount Due" dollar figure', 'The "Total Usage" reading in the Detail of Current Charges section', 'The account number', 'The page number'], answerIndex: 1, explain: 'The Detail of Current Charges section shows the metered kWh usage for the billing period, separate from dollar totals.' },
      { q: 'Which charges below are Delivery charges rather than Supply?', choices: ['Distribution Charge, Transmission Charge, Customer Charge', 'Generation charge only', 'None — everything on a National Grid bill is Supply', 'Only the Net Meter Recovery Charge'], answerIndex: 0, explain: 'Distribution, Transmission, and Customer charges are all part of Delivery — the cost to move electricity to the home, not the electricity itself.' },
      { q: 'What information is necessary before creating a solar proposal from this bill?', choices: ['Only the current Amount Due', '12 months of usage history, current supply rate/supplier status, and service address', 'Only the account number', 'The bill’s page count'], answerIndex: 1, explain: '12-month usage plus rate and supplier status are the minimum inputs for an accurate proposal — a single month is not enough.' },
      { q: 'What should the rep verify before estimating savings from this bill?', choices: ['Whether the customer has a third-party supplier and their current supply rate', 'The color of the customer’s roof', 'The customer’s favorite utility', 'Nothing — bills are self-explanatory'], answerIndex: 0, explain: 'Supplier status and supply rate materially change what "savings" actually means for this customer.' }
    ]
  },
  eversource: {
    name: 'Eversource',
    summary: 'Massachusetts Eversource residential bill: Account Summary, Meter & Usage Information, Supply Charges, Delivery Charges.',
    lineItems: [
      { label: 'Generation Srvc Chrg', kind: 'supply', note: 'Cost charged by the supplier for generating/supplying power.' },
      { label: 'Customer Chrg', kind: 'delivery', note: 'Basic fixed charge for maintaining account and service.' },
      { label: 'Distribution Dmd/Energy Chrg', kind: 'delivery', note: 'Charge for moving electricity through the local distribution network.' },
      { label: 'Transition Energy Chrg', kind: 'delivery', note: 'Adjustment related to legacy transition costs.' },
      { label: 'Net metering recovery surcharge', kind: 'delivery', note: 'Helps recover net metering program costs.' },
      { label: 'Solar Program Cost Adjustment', kind: 'delivery', note: 'Supports state solar incentive programs.' },
      { label: 'Renewable Energy Chrg', kind: 'delivery', note: 'Supports renewable and clean energy requirements.' },
      { label: 'Energy Efficiency', kind: 'delivery', note: 'Funds energy efficiency programs and incentives.' }
    ],
    usageChartNote: 'Monthly kWh Use table under Meter & Usage Information — shows recent months of usage history.',
    questions: [
      { q: 'Where is annual consumption found on an Eversource bill?', choices: ['The Monthly kWh Use table under Meter & Usage Information', 'The Total Amount Due line', 'The Account Number field', 'The Reading Type label alone'], answerIndex: 0, explain: 'The Monthly kWh Use table lists recent months of usage — this is the basis for annual consumption.' },
      { q: 'Which charge represents the cost of the electricity supply itself, not its delivery?', choices: ['Customer Chrg', 'Generation Srvc Chrg', 'Distribution Dmd Chrg', 'Net metering recovery surcharge'], answerIndex: 1, explain: 'Generation Srvc Chrg is a Supply charge — the cost of the electricity itself, billed under Supply Charges.' },
      { q: 'Which of these are Delivery charges on an Eversource bill?', choices: ['Generation Srvc Chrg only', 'Customer Chrg, Distribution charges, and the Renewable Energy Chrg', 'Only taxes', 'None of the listed items'], answerIndex: 1, explain: 'Delivery charges cover getting electricity to the home — Customer, Distribution, and program-support riders like the Renewable Energy Charge fall here.' },
      { q: 'What must a rep confirm before creating a solar proposal from an Eversource bill?', choices: ['Whether readings are Actual or Estimated, plus 12-month usage', 'The bill due date only', 'The account holder’s middle name', 'Nothing beyond the total amount due'], answerIndex: 0, explain: 'Estimated readings can distort a single month’s data — confirming reading type and using 12 months of usage protects proposal accuracy.' },
      { q: 'What should a rep verify before estimating savings on an Eversource account?', choices: ['Current Total Demand Use and whether it materially affects billing for this customer', 'The account’s original opening date only', 'Whether the customer likes their electric company', 'Nothing further is needed'], answerIndex: 0, explain: 'Understanding demand-related charges (where applicable) avoids overstating or understating projected savings.' }
    ]
  }
};

// ---------------- HVAC: BTU + Zone labs ----------------
var BTU_FACTORS = [
  { key: 'good', label: 'Well-insulated interior room', low: 18, high: 22, typical: 20 },
  { key: 'avg', label: 'Average MA room', low: 22, high: 28, typical: 25 },
  { key: 'poor', label: 'Older / poorly insulated room', low: 28, high: 35, typical: 30 },
  { key: 'sun', label: 'Sunroom, attic, or high-glass room', low: 35, high: 45, typical: 40, designReview: true }
];

var ZONE_LAB_LAYOUTS = [
  {
    id: 'ranch', name: '1,200 sq. ft. Open Ranch', sqft: 1200,
    description: 'Single-story, open living/dining/kitchen area, 3 bedrooms down a short hallway, doors typically stay open.',
    prompt: 'How many preliminary zones would you expect, and which rooms may need separate indoor units?',
    guidance: 'Likely 2–3 indoor units: one head can usually cover the open living/dining/kitchen area since air can circulate freely there; the bedroom wing likely needs its own zone(s) depending on how many doors stay closed.',
    expectedZoneRange: [2, 3]
  },
  {
    id: 'colonial', name: '1,500 sq. ft. Colonial', sqft: 1500,
    description: 'Two-story colonial: living area on the first floor, primary bedroom plus 2 additional bedrooms upstairs, small office/addition.',
    prompt: 'How many preliminary zones would you expect? Which rooms may need separate indoor units?',
    guidance: 'Likely 4–6 zones: living area, primary bedroom, additional bedrooms, and the office/addition typically each need their own zone because stairs and closed bedroom doors break up airflow paths.',
    expectedZoneRange: [4, 6]
  },
  {
    id: 'problem-room', name: 'Problem-Room Addition', sqft: 300,
    description: 'A single finished bonus room over the garage with high window area and no existing HVAC connection.',
    prompt: 'Could this room share a zone with an adjacent open room, or does it need design review?',
    guidance: 'Likely 1–2 heads for this kind of standalone addition/attic/sunroom project. High-glass or over-garage rooms often need extra design review rather than a simple sq-ft estimate.',
    expectedZoneRange: [1, 2],
    designReviewFlag: true
  }
];

var ZONE_LAB_QUESTIONS = [
  { q: 'A colonial has two upstairs bedrooms with doors that are normally kept closed. Can one indoor head reliably serve both?', choices: ['Yes, always', 'Usually not — closed doors block airflow, so each closed bedroom typically needs its own zone or a ducted solution', 'Only if the hallway light is left on', 'Only in summer'], answerIndex: 1, explain: 'Closed doors block the airflow a single head needs to condition a room, so closed bedrooms usually need their own zone.' },
  { q: 'An open-concept kitchen/living/dining area with no interior doors is being zoned. What is the likely approach?', choices: ['One zone can usually serve the whole open area, since air can freely circulate', 'Every room needs a separate head regardless of layout', 'No head is needed for open areas', 'Open areas always need design review before any estimate'], answerIndex: 0, explain: 'Open floor plans where air can move freely often need just one well-placed head for the whole area.' },
  { q: 'A two-story home has comfort complaints on both floors. What zoning principle applies?', choices: ['A single upstairs head will fix downstairs comfort too', 'A head upstairs rarely solves downstairs comfort, and vice versa — each floor typically needs its own zone(s)', 'Floors do not affect zoning decisions', 'Downstairs never needs its own zone'], answerIndex: 1, explain: 'Heat and cool air do not reliably travel between floors, so each floor generally needs its own zoning consideration.' },
  { q: 'Which condition below should trigger a design-review flag rather than a simple sq-ft based estimate?', choices: ['A standard interior bedroom', 'A sunroom with high glass area and an attic conversion', 'A hallway closet', 'A finished basement with no windows'], answerIndex: 1, explain: 'Sunrooms, attics, additions, and high-glass rooms carry heat-load risk that a simple square-footage estimate does not capture well.' }
];

// ---------------- Solar Objection Simulator (LAER) ----------------
var SOLAR_OBJECTION_SCENARIOS = [
  {
    id: 'obj-not-interested', objection: 'I’m not interested.',
    options: [
      { text: 'Totally fair. Most people aren’t interested until they actually see whether their bill can be reduced — are you against solar itself, or just against a sales pitch at the door?', correct: true },
      { text: 'Everyone says that at first, but I promise this will only take 5 minutes, just let me show you.', correct: false },
      { text: 'Okay, no problem, have a good day. (walks away immediately)', correct: false }
    ],
    bestResponse: 'Totally fair. Most people aren’t interested until they actually see whether their bill can be reduced — are you against solar itself, or just against a sales pitch at the door?',
    whyItWorks: 'It acknowledges the pushback without arguing, then asks a diagnostic question that separates "not interested in solar" from "not interested in a pitch right now" — either answer gives the rep a clear next move.',
    followUp: 'Are you against solar, or just against a sales pitch at the door?'
  },
  {
    id: 'obj-too-expensive', objection: 'Solar is too expensive.',
    options: [
      { text: 'That is exactly why we compare options — if the solar payment plus remaining utility bill isn’t better than what you already pay, we shouldn’t recommend it. When you say expensive, do you mean the monthly payment or the total project cost?', correct: true },
      { text: 'It’s actually not expensive at all once you factor in the incentives, trust me.', correct: false },
      { text: 'A lot of people think that, but they’re wrong once they see the numbers.', correct: false }
    ],
    bestResponse: 'That is exactly why we compare options — if the solar payment plus remaining utility bill isn’t better than what you already pay, we shouldn’t recommend it. When you say expensive, do you mean the monthly payment or the total project cost?',
    whyItWorks: 'It reframes "expensive" as a comparison problem, commits to walking away if the numbers don’t work (which builds trust), and explores what "expensive" actually means to this customer.',
    followUp: 'When you say expensive, do you mean the monthly payment or the total project cost?'
  },
  {
    id: 'obj-moving-soon', objection: 'I’m moving soon.',
    options: [
      { text: 'Most financing options are transferable, but it depends on the type and your timeline. Are you planning to move soon, or do you just want flexibility in case things change?', correct: true },
      { text: 'That doesn’t matter, solar adds value to any home so you should still do it.', correct: false },
      { text: 'Oh, in that case there’s no point, thanks anyway.', correct: false }
    ],
    bestResponse: 'Most financing options are transferable, but it depends on the type and your timeline. Are you planning to move soon, or do you just want flexibility in case things change?',
    whyItWorks: 'It gives an honest, non-absolute answer about transferability and then explores whether "moving soon" is a firm plan or a general hesitation.',
    followUp: 'Are you planning to move soon, or do you just want flexibility in case things change?'
  },
  {
    id: 'obj-roof-worried', objection: 'I’m worried about my roof.',
    options: [
      { text: 'That is a valid concern. Roof condition is part of our qualification process before anything is recommended — do you know the age of the roof, or is your main concern long-term leaks?', correct: true },
      { text: 'Don’t worry, roofs are never a problem for solar installs.', correct: false },
      { text: 'We can just install around any roof issues, it won’t matter.', correct: false }
    ],
    bestResponse: 'That is a valid concern. Roof condition is part of our qualification process before anything is recommended — do you know the age of the roof, or is your main concern long-term leaks?',
    whyItWorks: 'It validates a legitimate concern instead of dismissing it, and explores whether the issue is age, leaks, or something else — which determines the right next step.',
    followUp: 'Do you know the age of the roof, or is your main concern long-term leaks?'
  },
  {
    id: 'obj-no-loan', objection: 'I don’t want another loan.',
    options: [
      { text: 'That makes sense — not every financing option works the same way, which is why we compare ownership, loan, or third-party options carefully. Would it help to review the options that avoid the structure you’re concerned about?', correct: true },
      { text: 'It’s not really a loan, it just sounds like one.', correct: false },
      { text: 'You have to finance it somehow, there’s no way around that.', correct: false }
    ],
    bestResponse: 'That makes sense — not every financing option works the same way, which is why we compare ownership, loan, or third-party options carefully. Would it help to review the options that avoid the structure you’re concerned about?',
    whyItWorks: 'It acknowledges the concern honestly instead of minimizing it, and offers to explore alternative structures (cash, PPA, lease) rather than insisting on a loan.',
    followUp: 'Would it help to review the options that avoid the structure you’re concerned about?'
  },
  {
    id: 'obj-dont-trust', objection: 'I don’t trust solar companies.',
    options: [
      { text: 'Bad companies create that impression. The safest way to evaluate solar is to review the bill, design, equipment, warranties, and contract terms before making any decision. Is your concern the company, the financing, or whether the savings are real?', correct: true },
      { text: 'We’re not like those other companies, you can trust us.', correct: false },
      { text: 'That’s fine, I’ll just leave you my card in case you change your mind.', correct: false }
    ],
    bestResponse: 'Bad companies create that impression. The safest way to evaluate solar is to review the bill, design, equipment, warranties, and contract terms before making any decision. Is your concern the company, the financing, or whether the savings are real?',
    whyItWorks: 'It agrees the concern is reasonable, points to a verifiable process instead of a bare claim of trustworthiness, and explores the specific source of distrust.',
    followUp: 'Is your concern the company, the financing, or whether the savings are real?'
  },
  {
    id: 'obj-what-if-sell', objection: 'What happens when I sell my house?',
    options: [
      { text: 'Most options are transferable, but the process depends on financing type and your timeline. Are you planning to move soon, or do you just want to understand the options in case things change?', correct: true },
      { text: 'You won’t be able to sell the house until the system is paid off.', correct: false },
      { text: 'That never really comes up, don’t worry about it.', correct: false }
    ],
    bestResponse: 'Most options are transferable, but the process depends on financing type and your timeline. Are you planning to move soon, or do you just want to understand the options in case things change?',
    whyItWorks: 'It gives an accurate, non-absolute answer and invites the customer to clarify whether this is a near-term plan or a general question.',
    followUp: 'Are you planning to move soon, or do you just want to understand the options in case things change?'
  },
  {
    id: 'obj-think-about-it', objection: 'I need to think about it.',
    options: [
      { text: 'Of course. Usually the best next step is to isolate what needs more clarity before deciding — what part do you want to think through: the savings, the equipment, the contract, or the timing?', correct: true },
      { text: 'What’s there to think about, the numbers speak for themselves.', correct: false },
      { text: 'Okay, I’ll check back in a few months.', correct: false }
    ],
    bestResponse: 'Of course. Usually the best next step is to isolate what needs more clarity before deciding — what part do you want to think through: the savings, the equipment, the contract, or the timing?',
    whyItWorks: 'It respects the request to think without pressuring, and narrows down which specific part of the decision still needs clarity so the rep can actually help.',
    followUp: 'What part do you want to think through — the savings, the equipment, the contract, or the timing?'
  }
];

// ---------------- HVAC Roleplay Center ----------------
var HVAC_ROLEPLAY_SCENARIOS = [
  {
    id: 'rp1', title: 'Oil Heat, No Central AC, 1,800 sq ft Colonial',
    setup: 'Oil heat, no central AC, 1,800 sq. ft. colonial, 4 bedrooms.',
    task: 'Estimate likely zones and ask the right discovery questions before proposing anything.',
    modelApproach: 'Discovery first: which bedrooms are hardest to keep comfortable, current oil usage/cost, insulation condition, whether central AC is a goal or bonus. Zoning: expect a multi-zone colonial estimate (commonly 4–6 zones) given 4 separated bedrooms plus a living area, with the exact count confirmed by design review — never quote a final number at the door.'
  },
  {
    id: 'rp2', title: 'Customer Wants One Head for the Entire House',
    setup: 'The customer insists they only want one indoor head to cover the whole house.',
    task: 'Explain airflow and zoning limitations without sounding negative or argumentative.',
    modelApproach: 'Acknowledge the preference for simplicity, then explain that one head can serve an open area but not closed bedrooms down a hallway. Reframe: "That may work great for your open living area — for the bedrooms, let’s look at what would actually keep them comfortable too." Avoid flatly saying no; instead explain the airflow logic and offer to review the layout together.'
  },
  {
    id: 'rp3', title: 'Customer Believes Heat Pumps Don’t Work in MA Winters',
    setup: 'The customer says heat pumps do not work during Massachusetts winters.',
    task: 'Correct the misconception calmly and accurately, without overstating performance claims.',
    modelApproach: 'Modern cold-climate heat pumps are designed for low temperatures — the key to reliable winter comfort is correct sizing and weatherization, not the technology being unsuitable for MA. Avoid quoting a specific low-temperature performance percentage unless it is confirmed on the actual equipment spec sheet.'
  },
  {
    id: 'rp4', title: '"My Electric Bill Will Become Too Expensive"',
    setup: 'The customer is worried their electric bill will spike after installing a heat pump.',
    task: 'Reframe the concern around total energy cost, not a single line item.',
    modelApproach: 'Electric use may rise, but oil, propane, gas, or electric-resistance use may drop. Compare total energy cost across all fuels, not just the electric bill in isolation. Offer to review their current heating fuel spend alongside the expected electric change.'
  },
  {
    id: 'rp5', title: '"The Project Is Too Expensive"',
    setup: 'The customer pushes back on the total project price.',
    task: 'Move the conversation from gross cost to net value without discounting prematurely.',
    modelApproach: 'Walk through gross project cost → rebates and incentives (verified for this project) → net monthly view including the 0% HEAT Loan and current fuel costs. Close with: "The important number is not just the sticker price — it’s the net cost after verified incentives and what the upgrade does for comfort, fuel use, and home value."'
  },
  {
    id: 'rp6', title: '"Is the Rebate Guaranteed?"',
    setup: 'The customer asks whether the Mass Save rebate is guaranteed before they sign anything.',
    task: 'Give an honest, compliant answer about rebate verification.',
    modelApproach: 'No — rebates are not guaranteed until eligibility, equipment, contractor rules, paperwork, and deadlines are verified. Explain that Nexis verifies utility, fuel type, equipment, and weatherization status before finalizing net cost, so the number presented is accurate rather than optimistic.'
  }
];

// ---------------- Admin-editable Mass Save program database ----------------
function defaultMassSavePrograms() {
  return [
    {
      id: 'ms-whole-home', programName: 'Whole-Home Heat Pump Rebate', programType: 'Whole-Home',
      currentIncentive: '$2,650 per ton', maximumIncentive: 'Up to $8,500',
      eligibilityRequirements: 'System must displace fossil fuel or electric-resistance heat as primary heating source.',
      utilityRequirements: 'Participating MA electric utility (e.g., National Grid, Eversource) account required.',
      weatherizationRequirements: 'Home assessment / weatherization verification required per current program rules.',
      effectiveDate: '2026-01-01', expirationDate: '', lastVerified: '2026-09-01',
      source: 'Mass Save — Air Source Heat Pumps program page', reviewedBy: 'Nexis Power Training Team', status: 'active'
    },
    {
      id: 'ms-partial-home', programName: 'Partial-Home Heat Pump Rebate', programType: 'Partial-Home',
      currentIncentive: '$1,125 per ton', maximumIncentive: 'Up to $8,500',
      eligibilityRequirements: 'Existing heat source remains as backup; integrated controls may be required.',
      utilityRequirements: 'Participating MA electric utility account required.',
      weatherizationRequirements: 'Home assessment recommended; requirements vary by scope.',
      effectiveDate: '2026-01-01', expirationDate: '', lastVerified: '2026-09-01',
      source: 'Mass Save — Air Source Heat Pumps program page', reviewedBy: 'Nexis Power Training Team', status: 'active'
    },
    {
      id: 'ms-basic', programName: 'Basic Heat Pump Rebate', programType: 'Basic (non-displacement)',
      currentIncentive: '$250 per ton', maximumIncentive: 'Up to $2,500',
      eligibilityRequirements: 'Project does not displace existing oil, propane, natural gas, or electric-resistance heat.',
      utilityRequirements: 'Participating MA electric utility account required.',
      weatherizationRequirements: 'Not required for Basic tier.',
      effectiveDate: '2026-01-01', expirationDate: '', lastVerified: '2026-09-01',
      source: 'Mass Save — Air Source Heat Pumps program page', reviewedBy: 'Nexis Power Training Team', status: 'active'
    },
    {
      id: 'ms-income', programName: 'Enhanced Income-Eligible Pathway', programType: 'Income-Eligible',
      currentIncentive: 'Varies by household income', maximumIncentive: 'Up to $16,000 (or up to no-cost)',
      eligibilityRequirements: 'Household income verification against current income-eligible thresholds.',
      utilityRequirements: 'Participating MA electric utility account required.',
      weatherizationRequirements: 'Weatherization typically included/required as part of pathway.',
      effectiveDate: '2026-01-01', expirationDate: '', lastVerified: '2026-09-01',
      source: 'Mass Save — Income-Eligible program page', reviewedBy: 'Nexis Power Training Team', status: 'active'
    },
    {
      id: 'ms-heat-loan', programName: '0% HEAT Loan', programType: 'Financing',
      currentIncentive: '0% interest financing', maximumIncentive: 'Up to $25,000',
      eligibilityRequirements: 'Qualifying energy-efficiency upgrade through a participating lender.',
      utilityRequirements: 'Participating MA electric or gas utility account required.',
      weatherizationRequirements: 'Varies by upgrade type.',
      effectiveDate: '2026-01-01', expirationDate: '', lastVerified: '2026-09-01',
      source: 'Mass Save — 0% HEAT Loan program page', reviewedBy: 'Nexis Power Training Team', status: 'active'
    },
    {
      id: 'ms-connected-solutions', programName: 'ConnectedSolutions (Battery Storage)', programType: 'Battery Incentive',
      currentIncentive: '$275 / kW for summer event participation (verify current rate)', maximumIncentive: 'Varies by enrolled capacity',
      eligibilityRequirements: 'Eligible battery storage system enrolled in summer demand-response events.',
      utilityRequirements: 'Participating MA electric utility account required.',
      weatherizationRequirements: 'Not applicable.',
      effectiveDate: '2026-01-01', expirationDate: '', lastVerified: '2026-09-01',
      source: 'Mass Save — ConnectedSolutions program page', reviewedBy: 'Nexis Power Training Team', status: 'review_needed'
    },
    {
      id: 'ms-fed-credit', programName: 'Federal Residential Clean Energy Credit', programType: 'Federal Tax Credit',
      currentIncentive: '30% of qualified property cost', maximumIncentive: 'No stated cap on the 30% credit itself',
      eligibilityRequirements: 'Qualified property installed from 2022 through December 31, 2025.',
      utilityRequirements: 'Not applicable (federal, not utility-administered).',
      weatherizationRequirements: 'Not applicable.',
      effectiveDate: '2022-01-01', expirationDate: '2025-12-31', lastVerified: '2026-09-01',
      source: 'IRS — Residential Clean Energy Credit page & OBBB termination FAQ', reviewedBy: 'Nexis Power Training Team', status: 'expired'
    }
  ];
}

window.UTILITY_BILL_LAB = UTILITY_BILL_LAB;
window.BTU_FACTORS = BTU_FACTORS;
window.ZONE_LAB_LAYOUTS = ZONE_LAB_LAYOUTS;
window.ZONE_LAB_QUESTIONS = ZONE_LAB_QUESTIONS;
window.SOLAR_OBJECTION_SCENARIOS = SOLAR_OBJECTION_SCENARIOS;
window.HVAC_ROLEPLAY_SCENARIOS = HVAC_ROLEPLAY_SCENARIOS;
window.defaultMassSavePrograms = defaultMassSavePrograms;
