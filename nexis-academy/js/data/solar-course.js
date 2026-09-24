/* ============================================================
   NEXIS RESIDENTIAL SOLAR SALES CERTIFICATION
   Built from the Nexis Power MA Solar Sales Training Manual.
   Content block types: p | list | callout(kind) | table | say
   ============================================================ */

var SOLAR_COURSE = {
  id: 'solar',
  title: 'Nexis Residential Solar Sales Certification',
  short: 'Solar Sales',
  icon: '☀️',
  theme: 'solar',
  tagline: 'Massachusetts residential solar: bills, savings, and a compliant sales process.',
  badgeId: 'cert-solar',
  practicalExam: false,
  certValidityMonths: 12,
  exam: { bankVar: 'SOLAR_EXAM_BANK', numQuestions: 50, passPct: 80, complianceMinPct: 80, name: 'Nexis Residential Solar Sales Certification Exam' },
  modules: [
    {
      id: 'sol-m1', number: 1, title: 'Massachusetts Solar Market Context',
      subtitle: 'Why homeowners in Massachusetts care about electric costs',
      lessons: [{
        id: 'l1', title: 'Rising MA electric costs & what solar does for the customer', estMinutes: 8,
        body: [
          { type: 'p', text: 'Massachusetts homeowners pay some of the highest residential electric rates in the country. Average MA residential electricity prices have risen significantly over the last several decades (source: U.S. BLS via FRED).' },
          { type: 'callout', kind: 'tip', title: 'Rep takeaway', text: 'Solar lets the homeowner replace part of an unpredictable utility bill with a more controlled energy strategy.' },
          { type: 'say', text: '"Solar gives you a way to produce power on your roof instead of buying all of it from the utility."' },
          { type: 'list', title: 'What solar does for the customer', items: [
            'Control — reduces the energy bought from the utility. Value is strongest with good sun, enough usage, and a bill structure that can be offset.',
            'Predictability — loan, lease, or PPA options can move a variable utility-only bill toward a structured monthly energy payment plus any remaining utility charges.',
            'Home modernization — solar pairs with batteries, EV charging, heat pumps, and future electrification. Sell the customer’s future energy plan, not only panels.',
            'Resilience — solar alone normally shuts down in an outage for safety. Battery-backed systems can provide backup to selected circuits, but only when properly designed.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Do not overpromise', text: 'Do not guarantee a $0 bill unless the proposal and utility rules support it. Do not quote incentives unless verified for that project. Do not promise outage backup unless a battery and backup configuration is included. Do not give tax advice — refer customers to a tax professional.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'What is the correct rep talking point about what solar does for a homeowner’s bill?', choices: ['It replaces part of an unpredictable utility bill with a more controlled energy strategy', 'It guarantees the bill will drop to $0', 'It eliminates the need for a utility account entirely', 'It fixes electric rates for the utility company'], answerIndex: 0, explain: 'Solar reduces exposure to the utility bill — it does not eliminate the utility relationship or guarantee a $0 bill.' },
        { q: 'When can a rep promise outage backup power?', choices: ['Any time a system includes solar panels', 'Only when a battery and backup configuration is included and properly designed', 'Whenever the customer asks for it', 'Never, under any circumstance'], answerIndex: 1, explain: 'Solar alone shuts off during outages for safety. Backup requires a properly designed battery system.' }
      ]
    },
    {
      id: 'sol-m2', number: 2, title: 'How Residential Solar Works',
      subtitle: 'A simple explanation reps can use at the door or kitchen table',
      lessons: [{
        id: 'l1', title: 'From sunlight to savings', estMinutes: 9,
        body: [
          { type: 'list', title: 'The simple version', items: [
            '1. Panels collect sunlight — PV modules create direct current (DC) electricity when sunlight hits the cells.',
            '2. Inverter converts power — the inverter converts DC power into AC power the home can use.',
            '3. Home uses solar first — the house consumes solar power in real time before buying grid power.',
            '4. Excess can flow to the grid — extra production can export and create credits under applicable net metering rules.'
          ]},
          { type: 'table', title: 'Key terms every rep must know', headers: ['Term', 'Meaning', 'How to explain it'], rows: [
            ['kW', 'System size / power capacity at a point in time', '"The size of the engine."'],
            ['kWh', 'Energy used or produced over time', '"What the utility bills you for."'],
            ['Production', 'How much energy the system generates', 'Depends on size, sun, roof direction, shade, and weather.'],
            ['Consumption', 'How much energy the home uses', 'Shown on the bill and 12-month usage history.'],
            ['Offset', 'Percent of usage covered by solar production', '100% offset means annual production roughly matches annual usage.'],
            ['Net metering', 'Credits for eligible exported energy', 'The grid acts like an accounting system, not a physical battery.'],
            ['Interconnection', 'Utility approval to connect the system to the grid', 'Required before Permission to Operate (PTO).']
          ]},
          { type: 'list', title: 'How net metering should be explained', items: [
            'Solar panels produce electricity during the day.',
            'The home uses solar power first.',
            'Extra electricity is sent to the grid through a bi-directional meter.',
            'The utility gives bill credits for the excess power exported.',
            'At night or when solar production is low, the home uses electricity from the grid.',
            'Bill credits reduce what the customer pays for that electricity.'
          ]},
          { type: 'diagram', id: 'sol-diagram-solar-works', caption: 'Sunlight to savings: how a residential system flows into the home and the grid.' },
          { type: 'say', text: '"Save today. Use tomorrow. That’s the power of Net Metering."' }
        ]
      }],
      knowledgeCheck: [
        { q: 'What does the inverter do in a residential solar system?', choices: ['Stores excess solar energy for nighttime use', 'Converts DC electricity from the panels into AC electricity the home can use', 'Tracks the home’s 12-month usage history', 'Approves the system for grid interconnection'], answerIndex: 1, explain: 'Panels produce DC power; the inverter converts it to the AC power homes actually use.' },
        { q: 'A customer asks what "offset" means. What is the best explanation?', choices: ['The percent of the roof covered by panels', 'The percent of usage covered by solar production', 'The dollar amount financed on the solar loan', 'The number of panels needed for the home'], answerIndex: 1, explain: '100% offset means annual solar production roughly matches annual usage — it is not about roof coverage.' }
      ]
    },
    {
      id: 'sol-m3', number: 3, title: 'Solar System Components',
      subtitle: 'What is on the roof, wall, and electrical panel',
      lessons: [{
        id: 'l1', title: 'Main parts of a residential solar system', estMinutes: 7,
        body: [
          { type: 'list', title: '8 main components', items: [
            'Solar panels — capture sunlight and generate DC electricity.',
            'Racking / mounting system — secures panels safely to the roof.',
            'Inverter — converts DC electricity into usable AC electricity.',
            'Electrical panel — distributes solar power through the home and connects the system to household circuits.',
            'Utility meter / net meter — tracks energy sent to and received from the grid.',
            'Battery storage (optional) — stores extra solar energy for use at night or during outages.',
            'Monitoring system — lets homeowners track solar production and system performance.',
            'Grid connection — provides backup power when needed and receives excess solar energy.'
          ]},
          { type: 'diagram', id: 'sol-diagram-components', caption: 'Where each component physically lives on a residential system.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which component distributes solar power throughout the home and connects the system to household circuits?', choices: ['Racking system', 'Electrical panel', 'Utility meter', 'Monitoring system'], answerIndex: 1, explain: 'The electrical panel routes power to the home’s circuits and ties the solar system into the house wiring.' }
      ]
    },
    {
      id: 'sol-m4', number: 4, title: 'Site Qualification',
      subtitle: 'What makes a good solar home',
      lessons: [{
        id: 'l1', title: 'The 8-factor site qualification checklist', estMinutes: 8,
        body: [
          { type: 'list', title: 'What makes a good solar home', items: [
            'Roof orientation & tilt — south, southeast, or southwest-facing roofs usually produce the best output.',
            'Roof condition — a roof in good condition with years of life remaining is ideal before installation.',
            'Shade exposure — little to no shade from trees, chimneys, or nearby buildings helps maximize production.',
            'Available roof space — enough open, unobstructed roof area is needed to fit the right number of panels.',
            'Structural integrity — the roof structure should be strong enough to safely support the system.',
            'Electrical panel — the home should have adequate panel capacity or be eligible for an upgrade.',
            'Energy usage — homes with higher electricity usage often benefit most from going solar.',
            'Ownership & utility access — the homeowner should own the property and have utility service suitable for interconnection.'
          ]},
          { type: 'diagram', id: 'sol-diagram-site-compass', caption: 'South, southeast, and southwest-facing roofs typically produce the best output in Massachusetts.' },
          { type: 'callout', kind: 'tip', title: 'Rep rule', text: 'When all 8 factors align, you have a strong candidate for solar. A thorough site qualification ensures a safe, efficient, and high-performing system that delivers long-term value.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which roof orientation typically produces the best solar output in Massachusetts?', choices: ['North-facing', 'South, southeast, or southwest-facing', 'East-facing only', 'Orientation does not matter'], answerIndex: 1, explain: 'South-facing (and southeast/southwest) roofs generally receive the most usable sun exposure in the northern hemisphere.' },
        { q: 'A homeowner rents rather than owns their home. What does this mean for site qualification?', choices: ['It has no effect on qualification', 'Ownership and utility access are part of the 8-factor qualification checklist', 'Renters automatically qualify for better incentives', 'The roof condition factor no longer applies'], answerIndex: 1, explain: 'Ownership and interconnection-eligible utility service are one of the 8 qualification factors.' }
      ]
    },
    {
      id: 'sol-m5', number: 5, title: 'Massachusetts Utility Bill Mastery',
      subtitle: 'How Massachusetts electric bills are structured',
      lessons: [{
        id: 'l1', title: 'The 4 parts of a MA electric bill', estMinutes: 8,
        body: [
          { type: 'table', title: 'How MA electric bills are structured', headers: ['Section', 'What it is'], rows: [
            ['Supply charges', 'The cost of the electricity itself. Customers may receive supply from the utility’s basic service or a competitive supplier. Solar can reduce the kWh the customer needs to buy.'],
            ['Delivery charges', 'The cost to deliver power through poles, wires, substations, customer service, and grid-related programs. Often includes both fixed and volumetric items.'],
            ['Customer / fixed charges', 'A monthly account charge that often remains even if the home produces solar. This is why a "$0 utility bill" is not always realistic.'],
            ['Taxes, adjustments & riders', 'State, utility, energy-efficiency, renewable, transmission, or other adjustment line items. Reps must not guess — read the bill line by line.']
          ]},
          { type: 'callout', kind: 'compliance', title: 'Rep rule', text: 'Always ask for a full bill and 12 months of usage. A one-month bill is not enough to size a system correctly because MA usage changes across seasons.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Why does a "$0 electric bill" claim often mislead customers?', choices: ['Because solar panels degrade quickly', 'Because a monthly customer/fixed charge often remains even with solar production', 'Because Massachusetts does not allow net metering', 'Because inverters do not work in winter'], answerIndex: 1, explain: 'Fixed customer charges typically remain on the bill regardless of solar production, so a true $0 bill is not always realistic.' },
        { q: 'Why should a rep always request a full 12-month usage history instead of a single month’s bill?', choices: ['A single bill is against the law to review', 'MA usage changes across seasons, so one month is not enough to size a system correctly', 'Utilities do not provide single-month bills', 'It is only needed for commercial accounts'], answerIndex: 1, explain: 'Seasonal usage swings mean a single month can badly under- or over-estimate the right system size.' }
      ]
    },
    {
      id: 'sol-m6', number: 6, title: 'National Grid Bill Training',
      subtitle: 'Reading a National Grid electric bill',
      lessons: [{
        id: 'l1', title: 'What to point out on a National Grid bill', estMinutes: 9,
        body: [
          { type: 'list', title: 'Account Balance section', items: [
            'Previous Balance — the amount owed from the last bill.',
            'Payment(s) Received — payments applied since the last bill.',
            'Amount Past Due — any unpaid balance.',
            'Current Charges — new charges for this billing period.',
            'Amount Due — total amount due by the payment due date.'
          ]},
          { type: 'list', title: 'Detail of Current Charges', items: [
            'Customer Charge — a fixed daily charge to cover basic service.',
            'Distribution Charge (Dist Chg) — covers the cost of delivering electricity locally.',
            'Transition Charge — helps cover the cost of changing from higher-priced power contracts.',
            'Transmission Charge — pays for the regional delivery of electricity.',
            'Energy Efficiency Charge — supports energy efficiency programs.',
            'Renewable Energy Charge — supports renewable energy projects.',
            'Net Meter Recovery Charge — recovers costs related to customers who send energy back to the grid.',
            'Distributed Solar Charge — helps support local solar programs and infrastructure.',
            'Electric Vehicle Charge — funds programs that support EV infrastructure.'
          ]},
          { type: 'callout', kind: 'tip', title: 'Where to find annual consumption', text: 'The electric usage history chart on the bill shows kWh by month — this is where reps point customers to find annual consumption.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'On a National Grid bill, which charge is a fixed daily amount for basic service?', choices: ['Transmission Charge', 'Customer Charge', 'Renewable Energy Charge', 'Net Meter Recovery Charge'], answerIndex: 1, explain: 'The Customer Charge is the fixed daily charge for basic service, separate from usage-based charges.' },
        { q: 'Where on a National Grid bill would a rep find the customer’s monthly kWh usage history?', choices: ['The Payment Information section', 'The electric usage history chart', 'The Amount Past Due line', 'The Transition Charge line item'], answerIndex: 1, explain: 'The usage history chart shows kWh by month, which is essential for correctly sizing a solar proposal.' }
      ]
    },
    {
      id: 'sol-m7', number: 7, title: 'Eversource Bill Training',
      subtitle: 'Reading an Eversource electric bill',
      lessons: [{
        id: 'l1', title: 'What to point out on an Eversource bill', estMinutes: 9,
        body: [
          { type: 'list', title: 'Account Summary section', items: [
            'Amount Due — the total balance the customer needs to pay.',
            'Last Payment Received — the most recent payment credited to the account.',
            'Balance Forward — any unpaid balance carried over from the last bill.',
            'Electric Supply Services — the cost of the electricity supply itself.',
            'Delivery Services — the cost to deliver electricity to the home.',
            'Total Current Charges / Total Amount Due — the sum of this period’s charges and what is owed by the due date.'
          ]},
          { type: 'list', title: 'Meter & Usage / Supply / Delivery sections', items: [
            'Current Usage — electricity used during the billing cycle; Reading Type shows whether the reading is actual or estimated.',
            'Monthly kWh Use — usage history for recent months; Total Demand Use shows peak demand where applicable.',
            'Generation Srvc Chrg — the cost charged by the supplier for generating/supplying power.',
            'Customer Chrg — a basic fixed charge for maintaining the account and service.',
            'Distribution charges — the charge for moving electricity through the local distribution network.',
            'Net metering recovery surcharge & Solar Program Cost Adjustment — help recover net metering and state solar incentive program costs.',
            'Renewable Energy Chrg & Energy Efficiency — support renewable and clean energy requirements and efficiency programs.'
          ]},
          { type: 'callout', kind: 'tip', title: 'Note', text: 'Charge names and line items may vary slightly by rate, service type, or billing period — always read the specific bill in front of you rather than assuming.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'On an Eversource bill, which section shows whether a meter reading is actual or estimated?', choices: ['Account Summary', 'Meter & Usage Information', 'Delivery Charges', 'Supply Charges'], answerIndex: 1, explain: 'Reading Type, under Meter & Usage Information, indicates actual vs. estimated readings.' },
        { q: 'What should a rep do if Eversource bill line-item names differ slightly from what the training material shows?', choices: ['Assume the bill is fraudulent', 'Read the specific bill carefully — charge names can vary by rate, service type, or billing period', 'Refuse to review the bill', 'Use the National Grid template instead'], answerIndex: 1, explain: 'Line items can vary; reps should read what is actually on the bill rather than force-fitting a template.' }
      ]
    },
    {
      id: 'sol-m8', number: 8, title: 'Solar Savings',
      subtitle: 'How to explain money without overpromising',
      lessons: [{
        id: 'l1', title: 'The solar savings formula', estMinutes: 8,
        body: [
          { type: 'list', title: 'The 5-part savings formula', items: [
            'Current utility cost — what the customer pays now.',
            'Solar payment — loan, lease, PPA, or cash opportunity cost.',
            'Remaining utility bill — fixed charges plus uncovered usage.',
            'Incentives / credits — utility, state, federal, and battery incentives, when eligible.',
            'Net monthly value — savings, stability, resilience, and ownership, taken together.'
          ]},
          { type: 'list', title: 'Must-have inputs before proposing', items: ['12-month kWh usage', 'Current utility rate', 'Supplier status', 'Roof design', 'Production estimate', 'Financing option', 'Incentive eligibility', 'Customer goals'] },
          { type: 'callout', kind: 'compliance', title: 'Must-have disclosures', text: 'Solar production estimates are not guarantees. Incentives and tax benefits may change. The customer should review the proposal, utility approval, financing agreement, and get tax professional guidance.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which of these is NOT one of the 8 must-have inputs before proposing solar savings?', choices: ['12-month kWh usage', 'Current utility rate', 'The customer’s favorite color', 'Financing option'], answerIndex: 2, explain: 'Inputs must be tied to real, relevant data — usage, rate, supplier, roof, production, financing, incentives, and goals.' }
      ]
    },
    {
      id: 'sol-m9', number: 9, title: 'Solar Financing Options',
      subtitle: 'Common residential solar financing options',
      lessons: [{
        id: 'l1', title: 'Cash, loan, PPA, lease, and battery add-on', estMinutes: 9,
        body: [
          { type: 'table', title: 'Financing options', headers: ['Option', 'Best for', 'Customer owns system?'], rows: [
            ['Cash purchase', 'Highest long-term return, no monthly finance payment', 'Yes'],
            ['Solar loan', 'Ownership with low/no upfront cost', 'Yes'],
            ['PPA', 'Low upfront cost, payment per kWh produced', 'Usually no'],
            ['Lease', 'Low upfront cost with a fixed monthly solar payment', 'Usually no'],
            ['Battery add-on', 'Backup and demand-response value', 'Depends']
          ]},
          { type: 'callout', kind: 'tip', title: 'Rep rule', text: 'Do not sell financing before diagnosing the customer. Ask first: "Is your priority lowest monthly payment, ownership, backup power, or long-term return?"' }
        ]
      }],
      knowledgeCheck: [
        { q: 'A customer wants the lowest possible upfront cost and does not care about owning the system. Which options best fit?', choices: ['Cash purchase', 'PPA or lease', 'A larger battery only', 'A second mortgage'], answerIndex: 1, explain: 'PPAs and leases typically offer low upfront cost with the provider (not the homeowner) usually owning the system.' },
        { q: 'What should a rep ask BEFORE recommending a financing option?', choices: ['The customer’s exact income', 'Whether their priority is lowest payment, ownership, backup power, or long-term return', 'Whether they prefer cash or check', 'Nothing — always recommend the loan first'], answerIndex: 1, explain: 'Diagnosing the customer’s real priority comes before pitching any specific financing product.' }
      ]
    },
    {
      id: 'sol-m10', number: 10, title: 'Solar Incentives',
      subtitle: 'Incentives reps should understand, not overquote',
      lessons: [{
        id: 'l1', title: 'Net metering, SMART, ConnectedSolutions, and tax credits', estMinutes: 8,
        body: [
          { type: 'list', title: 'Incentives to understand at a conceptual level', items: [
            'Net metering — eligible systems can offset usage and receive billing credits for exported generation. Rules and credit values depend on utility and tariff.',
            'SMART — a Massachusetts solar incentive program designed to support solar development. Eligibility and payment structure depend on program rules and application status.',
            'ConnectedSolutions (batteries) — Mass Save-affiliated; eligible batteries can earn incentives for average summer event contribution.',
            'Federal Residential Clean Energy Credit — per the IRS, the 30% credit applies to qualified property installed from 2022 through December 31, 2025, and is not available for property placed in service after that date (per OBBB termination FAQ).',
            'MA Residential Energy Credit — a Massachusetts residential renewable energy credit may be available for qualifying property; eligibility and cap must be verified before quoting.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Rep rule', text: 'Understand these programs conceptually so you can explain them accurately — but never quote a specific incentive dollar amount to a customer without verifying it for that project. Program rules, deadlines, and figures change.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Per the IRS, when does the 30% federal Residential Clean Energy Credit for qualified property stop applying?', choices: ['Property placed in service after December 31, 2025', 'It never expires', 'It expired in 2022', 'Only Massachusetts residents ever qualified'], answerIndex: 0, explain: 'The credit applies to qualified property installed 2022 through Dec 31, 2025, and is not available after that date per the OBBB termination FAQ.' },
        { q: 'A homeowner asks exactly how much their SMART incentive payment will be. What is the compliant response?', choices: ['Quote a fixed number from memory', 'Explain the program conceptually and confirm eligibility/payment structure will be verified for their specific project', 'Tell them it is guaranteed at the program’s maximum', 'Say Nexis does not participate in SMART'], answerIndex: 1, explain: 'Incentive amounts depend on program rules and application status and must be verified per-project, not guessed or guaranteed.' }
      ]
    },
    {
      id: 'sol-m11', number: 11, title: 'Why Nexis Power',
      subtitle: 'How to differentiate the company',
      lessons: [{
        id: 'l1', title: 'Positioning Nexis as the trusted energy partner', estMinutes: 7,
        body: [
          { type: 'list', title: 'Position Nexis as the trusted energy partner', items: [
            '5-star reputation — verify the current Google rating live before using it in public-facing materials; never use an old or stale rating.',
            'MA energy expertise — Nexis reps are trained to clearly explain MA utility bills, solar incentives, batteries, and home efficiency options.',
            'Full energy roadmap — solar, battery, EV charging, efficiency, and future electrification are planned together instead of as separate projects.',
            'Professional process — discovery, bill review, site qualification, design, financing, permitting, installation, PTO, and post-install support.',
            'Customer education — a homeowner who understands the bill, system, and financing makes a better decision and creates fewer cancellations.'
          ]},
          { type: 'say', text: '"Nexis Power is not here to pressure you into panels. We are here to show you whether your home qualifies, what your bill can realistically look like, and which option makes the most financial sense."' },
          { type: 'list', title: 'Trust assets to collect before every campaign', items: [
            'Google reviews screenshot (up-to-date, verified live)',
            'Project photos (before/after solar, roof work, batteries, clean electrical)',
            'Licenses / insurance / warranties (know what can be shared and where to find it)',
            'Partner credentials (Mass Save, utility, manufacturer, financing — verified before publishing)',
            'Customer case studies (bill before, solution, system size, result — with permission)',
            'Install timeline data (realistic expectations for permits, utility approval, inspections, PTO)'
          ]}
        ]
      }],
      knowledgeCheck: [
        { q: 'Before using a "5-star reputation" claim in customer-facing materials, what must a rep do?', choices: ['Nothing, ratings never change', 'Verify the current Google rating live rather than relying on an old screenshot', 'Ask a manager to guess the rating', 'Only use ratings from a competitor'], answerIndex: 1, explain: 'Stale ratings can misrepresent the company’s current reputation — always verify live.' }
      ]
    },
    {
      id: 'sol-m12', number: 12, title: 'Solar Sales Process',
      subtitle: 'The step-by-step sales flow',
      lessons: [{
        id: 'l1', title: 'The 8-step Nexis sales flow', estMinutes: 8,
        body: [
          { type: 'list', title: 'The clean Nexis sales flow', items: [
            '1. Prospect — door, referral, realtor/loan officer, digital lead.',
            '2. Qualify — homeowner status, utility bill, roof/shade, credit/finance fit, decision makers.',
            '3. Discover — pain points: bill, rate increases, comfort, EV, battery backup, home value.',
            '4. Educate — explain the bill, solar, net metering, and system components in simple language.',
            '5. Design review — show layout, production, offset assumptions, and options.',
            '6. Finance review — compare cash, loan, PPA/lease, battery add-on if appropriate.',
            '7. Close next step — agreement, docs, site survey, interconnection, or a scheduled follow-up.',
            '8. Handoff — set expectations: permits, install, inspection, PTO, and support.'
          ]}
        ]
      }],
      knowledgeCheck: [
        { q: 'In the Nexis 8-step sales flow, what comes immediately BEFORE the design review step?', choices: ['Handoff', 'Discover and Educate', 'Finance review', 'Prospecting'], answerIndex: 1, explain: 'The flow is Prospect → Qualify → Discover → Educate → Design review → Finance review → Close next step → Handoff.' }
      ]
    },
    {
      id: 'sol-m13', number: 13, title: 'Discovery',
      subtitle: 'Discovery questions that create a strong proposal',
      lessons: [{
        id: 'l1', title: '8 discovery categories', estMinutes: 9,
        body: [
          { type: 'list', title: 'Ask across these categories', items: [
            'Bill pain — "What bothers you most about your electric bill?" "Has it changed in the last few years?"',
            'Future usage — "Are you adding EVs, mini-splits, heat pumps, a pool, or more living space?"',
            'Decision process — "Besides you, who else should review the numbers?"',
            'Roof and home — "How old is the roof? Any leaks, shade issues, or upcoming renovations?"',
            'Financial priority — "Is your priority lowest monthly payment, ownership, or biggest long-term savings?"',
            'Timing — "Are you hoping to move quickly or just exploring?"',
            'Backup / resilience — "Do outages matter to you? Would battery backup for key circuits be valuable?"',
            'Full energy roadmap — "Are you looking at solar only, or a broader energy plan?"'
          ]},
          { type: 'callout', kind: 'tip', title: 'Rep goal', text: 'Do not pitch before you diagnose. The best close is built from the customer’s own answers. Listen carefully, summarize what matters, and tie the proposal back to their priorities.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'What is the rep’s goal during the Discovery phase?', choices: ['Present pricing as quickly as possible', 'Gather the customer’s own priorities so the proposal reflects what matters to them', 'Skip straight to signing the agreement', 'Avoid asking about the roof to save time'], answerIndex: 1, explain: 'Discovery should surface the customer’s real priorities before any pitch is made.' }
      ]
    },
    {
      id: 'sol-m14', number: 14, title: 'Door-to-Door Solar Sales',
      subtitle: 'Daily execution, pitches, and field discipline',
      lessons: [{
        id: 'l1', title: 'How to prepare before knocking doors', estMinutes: 8,
        body: [
          { type: 'list', title: 'Pre-knock routine', items: [
            'Choose the right area — owner-occupied homes, higher-usage neighborhoods, strong roof exposure, visible comparable solar nearby.',
            'Check your appearance — clean branded shirt and badge if available; charged tablet/phone.',
            'Know your opener — natural, short, respectful; ready with one question that earns the next 30 seconds.',
            'Track every door — log every knock outcome (not home, renter, bad roof, interested, callback, appointment) with clean notes.',
            'Stay compliant — respect no-soliciting signs and local rules; never argue at the door; leave immediately if asked; safety first.',
            'Work the block — mention neighborhood trends without sharing private customer details; finish one block with discipline before moving on.',
            'Set your daily game plan — target area, start time, appointment goal, weather/daylight, teamwork coordination.',
            'Bring the right proof — reviews, project photos, financing talking points; use proof to build trust, not to overwhelm the homeowner.'
          ]}
        ]
      }, {
        id: 'l2', title: 'Solar pitches for the door', estMinutes: 8,
        body: [
          { type: 'say', text: '10-second opener: "Hi, I’m [Name] with Nexis Power. We’re in this area reviewing whether roofs qualify for Massachusetts solar programs and lower-cost energy options. I’m not here to sell you anything at the door — I just need to ask two quick questions. Do you own the home?"' },
          { type: 'list', title: 'Other opener styles', items: [
            'Bill-focused — "A lot of homeowners around here have seen electric costs jump. We’re doing free bill reviews to show what part of the bill solar can offset and whether the roof qualifies."',
            'Neighbor / social proof — "We’re working with homeowners nearby who want to compare their utility bill to a solar option."',
            'Battery opener — "Some homeowners are adding batteries because solar alone does not provide backup during an outage."'
          ]},
          { type: 'callout', kind: 'tip', title: 'Rep rule', text: 'Keep the tone conversational, local, and respectful. Do not overtalk. Your goal is not to close at the door — it is to earn the next step by asking a clear question, diagnosing the need, and setting a simple appointment.' }
        ]
      }]
    },
    {
      id: 'sol-m15', number: 15, title: 'Appointment Setting',
      subtitle: 'How to turn a door conversation into an appointment',
      lessons: [{
        id: 'l1', title: 'Micro-closes and the no-pressure posture', estMinutes: 8,
        body: [
          { type: 'list', title: 'Use simple micro-closes', items: [
            'Permission — "Would it be okay if I asked two quick questions to see if this is even worth looking at?"',
            'Qualify — "Do you own the home? Roughly how high has the electric bill been lately?"',
            'Bill review — "The only way to know if this makes sense is to compare your usage against production. Can you grab the electric bill, or do you have the utility app?"',
            'Decision makers — "Besides you, who else would want to review the numbers?"',
            'Schedule — "I can have a specialist build the numbers and walk you through it. What works better, later today or tomorrow evening?"'
          ]},
          { type: 'callout', kind: 'tip', title: 'No-pressure posture', text: 'The goal at the door is not a full sale. The goal is a qualified appointment with the right decision makers and utility data. Leave with respect, even if the answer is no.' },
          { type: 'callout', kind: 'compliance', title: 'Rep rule', text: 'Do not overtalk. The best close at the door is a simple next step: ask permission, diagnose briefly, and schedule the appointment while the conversation is still easy.' }
        ]
      }]
    },
    {
      id: 'sol-m16', number: 16, title: 'Solar Objections',
      subtitle: 'Top objections and strong rebuttals',
      lessons: [{
        id: 'l1', title: 'Common objections and how to respond', estMinutes: 12,
        body: [
          { type: 'table', title: 'Objections & rebuttals', headers: ['Objection', 'Rebuttal approach'], rows: [
            ['"I’m not interested."', 'Totally fair. Most people aren’t interested until they see whether their bill can actually be reduced. Follow-up: are you against solar, or just against a pitch at the door?'],
            ['"Solar is too expensive."', 'That is exactly why we compare options — if the solar payment plus remaining utility bill isn’t better than what they already pay, we shouldn’t recommend it.'],
            ['"I need to think about it."', 'Of course. Isolate what needs more clarity: savings, equipment, contract, or timing?'],
            ['"What happens if I move?"', 'Most options are transferable, but it depends on financing type and timeline.'],
            ['"I have to talk to my spouse."', 'That makes sense — solar should be reviewed with everyone involved in the decision.'],
            ['"I don’t want a lien on my house."', 'Not every financing option works the same way — compare ownership, loan, or third-party options carefully.'],
            ['"My roof is too old."', 'Roof condition is part of the qualification process — let’s find out the roof’s age before recommending anything.'],
            ['"I already have a supplier."', 'Solar can still be evaluated, but supplier status matters because we need the bill details to compare correctly.']
          ]},
          { type: 'callout', kind: 'tip', title: 'Rep rule', text: 'Do not argue. Slow the conversation down, acknowledge the concern, ask one clarifying question, and respond simply. The goal is trust and a qualified next step — not winning the debate.' }
        ]
      }]
    },
    {
      id: 'sol-m17', number: 17, title: 'LAER Objection Framework',
      subtitle: 'Listen, Acknowledge, Explore, Respond',
      lessons: [{
        id: 'l1', title: 'The LAER method', estMinutes: 9,
        body: [
          { type: 'list', title: 'L-A-E-R', items: [
            'Listen — let the homeowner finish without interrupting. Pay attention to the exact concern and the emotion behind it. Do not correct too early; first make them feel heard.',
            'Acknowledge — use simple phrases like "That makes sense" or "I hear that a lot." Show empathy without agreeing with a misconception. Keep your tone calm, confident, respectful.',
            'Explore — ask one question to uncover the real issue behind the objection. Is the concern price, roof, timing, trust, or ownership? Example: "What part of it feels expensive?"',
            'Respond — answer with facts, a clear analogy, or a next step. Keep it simple; end with a question or transition to keep the conversation moving.'
          ]},
          { type: 'callout', kind: 'tip', title: 'Example: "Solar is too expensive"', text: 'Listen: let them finish, avoid arguing. Acknowledge: "I understand. A lot of people feel that way at first." Explore: "When you say expensive, do you mean the monthly payment or the total project cost?" Respond: "That makes sense. What we compare is what you already pay the utility versus what it costs to produce some of that power on your roof. Can I show you the side-by-side?"' },
          { type: 'callout', kind: 'compliance', title: 'Rep rule', text: 'Do not debate to win. Slow the conversation down, diagnose the concern, and respond with clarity. The goal is trust, not pressure.' }
        ]
      }]
    },
    {
      id: 'sol-m18', number: 18, title: 'Compliance & Accuracy',
      subtitle: 'Protect the customer, the rep, and the company',
      lessons: [{
        id: 'l1', title: 'The compliance checklist', estMinutes: 10,
        body: [
          { type: 'list', title: 'What every rep must verify before presenting numbers', items: [
            'Customer profile — confirm name, verify service address, confirm utility company and rate class, check homeowner/decision-maker status.',
            'Usage data — gather 12-month kWh usage, use interval data when available, note seasonal highs and lows.',
            'Utility bill details — check the current supply rate, verify third-party supplier status, review fixed and delivery charges.',
            'Roof and site qualification — verify roof age/condition, review shade/orientation/usable roof area, flag structural concerns.',
            'System assumptions — confirm estimated system size, review production methodology, explain that estimates are projections, not guarantees.',
            'Financing and contract terms — confirm cash/loan/lease/PPA structure, review escalator if applicable, clarify fees and term length.',
            'Incentives and battery scope — verify incentive eligibility, confirm tax-credit assumptions carefully, clarify battery scope (whole home, critical loads, or no backup).',
            'Timeline and interconnection — explain the interconnection path, set realistic expectations for permitting/install/PTO, confirm the customer understands what happens next.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Golden rule', text: 'A clean sale is a sale the customer still understands after you leave. If the customer cannot explain what they signed, slow down and reteach. Accuracy beats speed — verify first, then present.' },
          { type: 'table', title: 'Language guardrails', headers: ['Instead of saying…', 'Say this instead…'], rows: [
            ['"You will never pay an electric bill again."', '"The goal is to reduce the electricity you purchase from the utility. Some fixed charges or uncovered usage may still remain."'],
            ['"The government pays for it."', '"There may be incentives or tax credits if you qualify, but eligibility and program rules must be verified."'],
            ['"Your system will work in an outage."', '"Solar alone typically shuts down during an outage. Backup power usually requires a properly designed battery system."'],
            ['"Rates will definitely double."', '"Utility rates have historically increased, but future rates are not guaranteed. Solar can help reduce exposure to rising costs."'],
            ['"Sign now or lose everything."', '"Some incentives or utility conditions can change, so it’s worth reviewing carefully — the decision should still make sense for the homeowner."'],
            ['"This is basically free."', '"The right question is whether the solar structure makes sense compared with what the customer already pays today."'],
            ['"The battery will run your whole house."', '"Backup depends on battery size, system design, and whether the project is set up for whole-home or critical-load backup."'],
            ['"We guarantee exact savings and production."', '"Production and savings are estimates based on assumptions such as usage, weather, rate structure, and system design."']
          ]},
          { type: 'callout', kind: 'compliance', title: 'Rep rule', text: 'If a sentence sounds absolute, guaranteed, or too aggressive, slow down and rephrase it. Clear language protects the customer, the rep, and the company.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which statement below is the COMPLIANT way to talk about outage backup?', choices: ['"Your system will work in an outage."', '"Solar alone typically shuts down during an outage. Backup power usually requires a properly designed battery system."', '"The battery will run your whole house no matter what."', '"Outages never affect solar customers."'], answerIndex: 1, explain: 'This is the approved guardrail language — accurate about backup scope without overpromising.' },
        { q: 'What is the "golden rule" of compliance at Nexis Power?', choices: ['Close as fast as possible', 'A clean sale is one the customer can still explain after you leave — if they can’t, slow down and reteach', 'Always match a competitor’s price', 'Skip the bill review to save time'], answerIndex: 1, explain: 'Customer understanding, not sales speed, is the standard for a clean, compliant sale.' }
      ]
    }
  ]
};

window.SOLAR_COURSE = SOLAR_COURSE;
