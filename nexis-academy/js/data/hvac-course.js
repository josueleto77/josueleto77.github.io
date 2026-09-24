/* ============================================================
   NEXIS HVAC & MINI-SPLIT SALES CERTIFICATION
   Built from the Nexis Power Mini-Split Heat Pump Sales Training deck.
   Core rule threaded throughout: reps pre-qualify, educate, and estimate.
   Final equipment sizing is verified by qualified HVAC design (Manual J).
   ============================================================ */

var HVAC_COURSE = {
  id: 'hvac',
  title: 'Nexis HVAC & Mini-Split Sales Certification',
  short: 'HVAC Sales',
  icon: '❄️',
  theme: 'hvac',
  tagline: 'Ductless mini-split heat pumps: comfort, zoning, BTU pre-qualification, and Mass Save.',
  badgeId: 'cert-hvac',
  practicalExam: false,
  certValidityMonths: 12,
  exam: { bankVar: 'HVAC_EXAM_BANK', numQuestions: 40, passPct: 80, complianceMinPct: 80, name: 'Nexis HVAC & Mini-Split Sales Certification Exam' },
  modules: [
    {
      id: 'hv-m1', number: 1, title: 'Mini-Split Fundamentals',
      subtitle: 'What is a ductless mini-split?',
      lessons: [{
        id: 'l1', title: 'The core concept', estMinutes: 7,
        body: [
          { type: 'p', text: 'A ductless mini-split is a heat pump system that heats and cools specific rooms or zones without traditional ductwork.' },
          { type: 'list', title: 'Four core properties', items: [
            'Heating — moves heat from outdoor air into the home, even in cold weather.',
            'Cooling — reverses the cycle and removes heat from the home in summer.',
            'Zoning — each indoor head serves a room or connected open area.',
            'Efficiency — transfers heat instead of burning fuel or creating heat with resistance.'
          ]},
          { type: 'say', text: '"It is like an AC and heater in one, but it moves heat instead of making heat."' },
          { type: 'callout', kind: 'compliance', title: 'Core training rule', text: 'Sales reps can pre-qualify, educate, and estimate. Final equipment sizing must be verified by qualified HVAC design and load calculations. This rule applies across every module in this certification.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'What is the single best plain-language explanation of a mini-split for a homeowner?', choices: ['"It burns fuel more efficiently than a furnace."', '"It is like an AC and heater in one, but it moves heat instead of making heat."', '"It only works in the summer."', '"It requires new ductwork to be installed."'], answerIndex: 1, explain: 'This is the approved simple explanation — mini-splits transfer heat rather than generate it by burning fuel.' }
      ]
    },
    {
      id: 'hv-m2', number: 2, title: 'How Heat Pumps Work',
      subtitle: 'The heat transfer story',
      lessons: [{
        id: 'l1', title: 'The refrigeration cycle, simply explained', estMinutes: 8,
        body: [
          { type: 'list', title: 'Three steps', items: [
            '1. Refrigerant absorbs heat — refrigerant circulates through coils and changes pressure to pick up or release heat.',
            '2. Compressor moves the energy — the compressor is the "engine" that moves heat between outdoor and indoor coils.',
            '3. Indoor unit distributes comfort — the indoor fan delivers warm or cool air directly into the room or zone.'
          ]},
          { type: 'diagram', id: 'hv-diagram-cycle', caption: 'The refrigeration cycle: how a heat pump moves heat between the outdoor and indoor coils.' },
          { type: 'callout', kind: 'tip', title: 'Key idea', text: 'A heat pump does not create heat — it transfers heat from outside to inside using refrigerant, pressure changes, and heat exchange.' },
          { type: 'callout', kind: 'tip', title: 'Sales takeaway', text: 'Homeowners buy comfort, not refrigerant cycles. Keep the explanation simple.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which best describes how a heat pump produces warmth in the winter?', choices: ['It burns a small amount of fuel inside the compressor', 'It transfers heat from outdoor air into the home using refrigerant and a compressor', 'It uses electric resistance coils exclusively', 'It only works when the outdoor unit is in direct sunlight'], answerIndex: 1, explain: 'Heat pumps move heat rather than generate it — refrigerant absorbs outdoor heat and the compressor moves that energy indoors.' }
      ]
    },
    {
      id: 'hv-m3', number: 3, title: 'System Anatomy',
      subtitle: 'Parts of a mini-split system',
      lessons: [{
        id: 'l1', title: 'Know the components', estMinutes: 6,
        body: [
          { type: 'list', title: 'Four component groups', items: [
            'Outdoor condenser — compressor, fan, outdoor coil, refrigerant service valves, pad or bracket.',
            'Indoor air handler — wall head, floor mount, cassette, or concealed ducted unit.',
            'Line set + drain — copper refrigerant lines, insulation, condensate drain, and line-hide.',
            'Electrical + controls — disconnect, wiring, remote, smart controls, integrated controls if needed.'
          ]},
          { type: 'diagram', id: 'hv-diagram-anatomy', caption: 'The four component groups of a mini-split installation.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which part of the system includes the compressor and outdoor coil?', choices: ['The indoor air handler', 'The outdoor condenser', 'The line set', 'The remote control'], answerIndex: 1, explain: 'The compressor, fan, and outdoor coil live in the outdoor condenser unit.' }
      ]
    },
    {
      id: 'hv-m4', number: 4, title: 'Indoor Unit Options',
      subtitle: 'Not every mini-split has to be a wall head',
      lessons: [{
        id: 'l1', title: 'Four indoor styles', estMinutes: 7,
        body: [
          { type: 'table', title: 'Indoor unit types', headers: ['Type', 'Best for'], rows: [
            ['Wall-mounted head', 'Most common, efficient, easy to service. Great for bedrooms, living rooms, additions.'],
            ['Floor-mounted unit', 'Good for low-wall installs, knee walls, and some older homes.'],
            ['Ceiling cassette', 'Cleaner look when ceiling access is available; common in larger rooms.'],
            ['Concealed ducted', 'Uses short duct runs for multiple nearby rooms; more hidden but higher design complexity.']
          ]}
        ]
      }],
      knowledgeCheck: [
        { q: 'A customer wants a cleaner look with no visible wall unit and has ceiling access. Which option fits best?', choices: ['Wall-mounted head', 'Floor-mounted unit', 'Ceiling cassette or concealed ducted', 'None of these options exist'], answerIndex: 2, explain: 'Ceiling cassette and concealed ducted options minimize visible equipment when ceiling access allows it.' }
      ]
    },
    {
      id: 'hv-m5', number: 5, title: 'Why Massachusetts Homeowners Buy Heat Pumps',
      subtitle: 'Benefits to emphasize in MA',
      lessons: [{
        id: 'l1', title: 'Lead with the pain point', estMinutes: 8,
        body: [
          { type: 'p', text: 'Lead with the pain point: uneven rooms, old systems, high fuel bills, no central AC, or future electrification.' },
          { type: 'list', title: 'Benefits to emphasize', items: [
            'Heating and cooling from one system.',
            'Room-by-room control instead of one thermostat for the whole house.',
            'Can reduce run time on oil, propane, electric resistance, or aging equipment.',
            'Adds AC to homes without ductwork.',
            'Quiet operation and improved comfort in problem rooms.',
            'Pairs well with insulation, solar, batteries, and home energy planning.'
          ]},
          { type: 'say', text: '"This is not just equipment. It is a comfort upgrade, efficiency upgrade, and long-term energy strategy."' }
        ]
      }]
    },
    {
      id: 'hv-m6', number: 6, title: 'HVAC Discovery',
      subtitle: 'Questions that reveal the right opportunity',
      lessons: [{
        id: 'l1', title: 'Six discovery areas', estMinutes: 8,
        body: [
          { type: 'list', title: 'Ask about', items: [
            'Comfort — which rooms are too hot, too cold, or hard to control?',
            'Current fuel — oil, propane, gas, electric resistance, or existing heat pump?',
            'Usage — which rooms are occupied daily vs. occasionally?',
            'Home layout — open concept, closed bedrooms, multiple floors, additions?',
            'Home shell — insulation, drafts, attic condition, old windows, basement?',
            'Future plans — solar, battery, EV, renovations, aging equipment replacement?'
          ]}
        ]
      }],
      knowledgeCheck: [
        { q: 'A good mini-split sale starts with finding what?', choices: ['The lowest possible price to quote first', 'The real comfort problem, through discovery', 'The exact BTU rating without any discovery', 'The customer’s decision to buy solar'], answerIndex: 1, explain: 'Discovery uncovers the real comfort problem, which drives an accurate, relevant recommendation.' }
      ]
    },
    {
      id: 'hv-m7', number: 7, title: 'Comfort Zoning',
      subtitle: 'How to think about number of mini-splits',
      lessons: [{
        id: 'l1', title: 'Zone = where air can actually move', estMinutes: 9,
        body: [
          { type: 'p', text: 'The number of heads is based on airflow and room separation, not just total square footage.' },
          { type: 'callout', kind: 'tip', title: 'Zone definition', text: 'One head can serve an open living/dining/kitchen area. It cannot reliably condition closed bedrooms down a hallway.' },
          { type: 'table', title: 'Home shape affects zone count', headers: ['Home type', 'Typical zoning'], rows: [
            ['Open ranch', 'Often fewer heads if the layout is open and doors stay open.'],
            ['Colonial', 'Often more heads because stairs and bedrooms are separated.']
          ]},
          { type: 'diagram', id: 'hv-diagram-zoning', caption: 'Same rough square footage, very different zoning — layout drives the head count, not size alone.' },
          { type: 'callout', kind: 'compliance', title: 'Sales takeaway', text: 'Do not promise "one unit for the whole house" unless the airflow path and load support it.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'What determines the number of indoor heads a home is likely to need?', choices: ['Total square footage alone', 'Airflow paths and room separation, not just square footage', 'The color of the exterior siding', 'The age of the homeowner'], answerIndex: 1, explain: 'Zoning is about where air can actually circulate — closed rooms and separate floors typically need their own zones.' },
        { q: 'Why might a colonial-style home typically need more zones than an open ranch of similar size?', choices: ['Colonials always have larger rooms', 'Stairs and separated bedrooms break up airflow paths', 'Ranches do not allow heat pumps', 'Colonials have lower ceilings'], answerIndex: 1, explain: 'Closed-off bedrooms and multiple floors in a colonial typically require separate zones for real comfort.' }
      ]
    },
    {
      id: 'hv-m8', number: 8, title: 'Load First, Equipment Second',
      subtitle: 'The sizing principle behind every proposal',
      lessons: [{
        id: 'l1', title: 'Heat loss/heat gain, not guesswork', estMinutes: 8,
        body: [
          { type: 'list', title: 'Sizing principles', items: [
            'Square footage is only the starting point.',
            'Insulation, windows, ceiling height, sun exposure, and air leakage matter.',
            'Closed doors and multiple floors increase the number of zones.',
            'Oversizing can cause short cycling and poor humidity control.',
            'Undersizing can leave rooms uncomfortable in winter.',
            'Final design should always be validated with Manual J and manufacturer data.'
          ]},
          { type: 'list', title: 'Sales sizing workflow', items: [
            '1. Map the home — rooms, floors, open areas, doors, stairways, sun exposure.',
            '2. Group zones — each indoor head should serve an area where air can actually circulate.',
            '3. Estimate BTU load — use sq ft × BTU factor, then adjust for insulation, windows, ceilings, layout.',
            '4. Match equipment — select indoor head sizes and outdoor capacity; avoid oversizing.',
            '5. Confirm with a pro — validate final sizing with Manual J / HVAC design.'
          ]}
        ]
      }],
      knowledgeCheck: [
        { q: 'What can happen if a mini-split system is oversized for a room?', choices: ['Nothing, bigger is always better', 'Short cycling and poor humidity control', 'The unit will use less electricity', 'It automatically resizes itself'], answerIndex: 1, explain: 'Oversized systems cycle on and off too quickly, which hurts comfort and humidity control.' }
      ]
    },
    {
      id: 'hv-m9', number: 9, title: 'Preliminary BTU Estimation',
      subtitle: 'For sales pre-qualification only — not final HVAC design',
      lessons: [{
        id: 'l1', title: 'The sales-friendly BTU table', estMinutes: 8,
        body: [
          { type: 'table', title: 'Fast BTU estimation table (pre-qualification only)', headers: ['Zone condition', 'Starting point'], rows: [
            ['Well-insulated interior room', '18–22 BTU / sq. ft.'],
            ['Average MA room', '22–28 BTU / sq. ft.'],
            ['Older / poorly insulated room', '28–35 BTU / sq. ft.'],
            ['Sunroom, attic, high glass', '35+ BTU / sq. ft. + design review required']
          ]},
          { type: 'callout', kind: 'compliance', title: 'FOR SALES PRE-QUALIFICATION ONLY — NOT FINAL HVAC DESIGN', text: 'Example: 250 sq. ft. average bedroom × 25 BTU/sq. ft. ≈ 6,250 BTU. Likely review a 6k–9k indoor head depending on the room and actual load. The final equipment selection must be verified through qualified HVAC design, manufacturer data, and appropriate load calculations.' }
        ]
      }, {
        id: 'l2', title: 'Try it: Preliminary BTU Estimator', estMinutes: 6,
        interactive: 'btu-lab-embed',
        body: [
          { type: 'p', text: 'Open the full Preliminary BTU Estimator in the Practice Center to run your own room calculations. It uses the exact table above and always displays the design-review disclaimer.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'A 300 sq. ft. room in an older, poorly-insulated home is being pre-qualified. Using the low end of the correct factor (28 BTU/sq ft), what is the estimated load?', choices: ['3,600 BTU', '8,400 BTU', '6,000 BTU', '12,000 BTU'], answerIndex: 1, explain: '300 × 28 = 8,400 BTU. This is a pre-qualification estimate only, not final design.' },
        { q: 'How should a rep present a preliminary BTU estimate to a homeowner?', choices: ['As the final, guaranteed equipment size', 'As a pre-qualification number, with final sizing to be confirmed by HVAC design', 'As a legally binding quote', 'Reps should never mention BTUs at all'], answerIndex: 1, explain: 'BTU pre-estimates are for sales qualification only — final sizing always requires professional load calculation.' }
      ]
    },
    {
      id: 'hv-m10', number: 10, title: 'How Many Indoor Heads?',
      subtitle: 'A practical zone-count method',
      lessons: [{
        id: 'l1', title: 'Six-step zone-count method', estMinutes: 8,
        body: [
          { type: 'list', title: 'Use layout logic before talking equipment sizes', items: [
            '1. Start with comfort goals — whole home, partial home, problem rooms, or AC-only comfort?',
            '2. Map closed rooms — closed bedrooms usually need their own head or a ducted solution.',
            '3. Group open areas — kitchen/living/dining may be one large zone if airflow is open.',
            '4. Check floors — a head upstairs rarely solves downstairs comfort, and vice versa.',
            '5. Consider aesthetics — some clients prefer fewer visible heads and concealed ducted options.',
            '6. Flag design risks — sunrooms, attics, additions, basements, and old homes require extra review.'
          ]}
        ]
      }]
    },
    {
      id: 'hv-m11', number: 11, title: 'Example Home Layouts',
      subtitle: 'What the rep should estimate before design',
      lessons: [{
        id: 'l1', title: 'Conversation examples, not final engineering', estMinutes: 7,
        body: [
          { type: 'table', title: 'Example layouts', headers: ['Layout', 'Likely zone estimate'], rows: [
            ['1,200 sq. ft. open ranch', 'Likely 2–3 indoor units: main living area plus bedroom wing, depending on doors and insulation.'],
            ['1,500 sq. ft. colonial', 'Likely 4–6 zones: living area, primary bedroom, additional bedrooms, office/addition.'],
            ['Problem-room project', 'Likely 1–2 heads for addition, attic office, sunroom, finished basement, or bedroom over garage.']
          ]},
          { type: 'callout', kind: 'compliance', title: 'Warning line to memorize', text: '"Based on layout, I expect around X zones. Our design team will confirm the final head count and sizes after load review."' }
        ]
      }]
    },
    {
      id: 'hv-m12', number: 12, title: 'HVAC Walkthrough Checklist',
      subtitle: 'What to capture before proposal',
      lessons: [{
        id: 'l1', title: 'Better notes, better designs', estMinutes: 8,
        body: [
          { type: 'list', title: 'Capture before proposal', items: [
            'Room dimensions or approximate square footage.',
            'Ceiling height, insulation level, and visible drafts.',
            'Window size, sun exposure, and glass-heavy rooms.',
            'Where indoor heads could realistically be placed.',
            'Where the outdoor condenser could sit: snow clearance, service access, noise, aesthetics.',
            'Electrical panel location, capacity concerns, and routing paths.',
            'Existing heating type and whether it will stay as backup.',
            'Photos of rooms, exterior walls, panel, basement/attic access, and proposed line-set route.'
          ]},
          { type: 'callout', kind: 'tip', title: 'Sales note', text: 'Clean data up front makes Nexis look professional and helps protect margin.' }
        ]
      }]
    },
    {
      id: 'hv-m13', number: 13, title: 'Mass Save Conversation',
      subtitle: 'How to explain MA incentives',
      lessons: [{
        id: 'l1', title: 'Rebate categories and the HEAT Loan', estMinutes: 9,
        body: [
          { type: 'callout', kind: 'compliance', title: 'Always verify first', text: 'Always verify eligibility before quoting final net cost. Program rules can change — the figures below are the currently published categories, verified per project before presenting.' },
          { type: 'table', title: 'Mass Save rebate categories', headers: ['Category', 'Published rebate level'], rows: [
            ['Whole-home rebate', '$2,650 per ton, up to $8,500, for eligible systems displacing fossil fuel/electric resistance heat.'],
            ['Partial-home rebate', '$1,125 per ton, up to $8,500, where existing heat remains with required controls/conditions.'],
            ['Basic rebate', '$250 per ton, up to $2,500, for certain non-displacement heat pump projects.'],
            ['Enhanced income pathway', 'Up to $16,000, or up to no-cost, through income-eligible pathways.']
          ]},
          { type: 'callout', kind: 'tip', title: '0% HEAT Loan', text: 'Mass Save lists 0% financing up to $25,000 for qualifying energy-efficiency upgrades through participating lenders.' },
          { type: 'say', text: '"We will verify your utility, fuel type, equipment, weatherization status, and program paperwork before showing final rebate numbers."' },
          { type: 'callout', kind: 'tip', title: 'Live program data', text: 'This module reads its numbers from the Mass Save program database, which admins keep current. Open the Practice Center → Mass Save Programs to see the live, editable record for each program.' }
        ]
      }],
      knowledgeCheck: [
        { q: 'Which Mass Save rebate category is designed to serve the FULL heating load and typically requires displacing the existing fossil-fuel system?', choices: ['Basic rebate', 'Whole-home rebate', 'Partial-home rebate', 'None of these'], answerIndex: 1, explain: 'The whole-home category is designed to serve the full heating load, generally displacing fossil fuel or electric resistance heat.' },
        { q: 'What must a rep do before presenting final Mass Save rebate numbers to a customer?', choices: ['Nothing, the categories never change', 'Verify utility, fuel type, equipment, weatherization status, and program paperwork', 'Only ask the customer’s income', 'Assume the whole-home category always applies'], answerIndex: 1, explain: 'Program eligibility depends on several verified factors, not assumption.' }
      ]
    },
    {
      id: 'hv-m14', number: 14, title: 'Whole-Home vs Partial-Home',
      subtitle: 'Choose the right rebate path early',
      lessons: [{
        id: 'l1', title: 'Classify the project correctly', estMinutes: 8,
        body: [
          { type: 'table', title: 'Three project categories', headers: ['Category', 'Description'], rows: [
            ['Whole-home', 'Designed to serve the full heating load. Existing fossil fuel system may need to be removed or not used as primary heat depending on requirements. Weatherization and verification matter.'],
            ['Partial-home', 'Heat pump serves part of the home or works with the existing system. Integrated controls may be required when fossil fuel backup remains.'],
            ['Basic', 'For projects that do not displace existing oil, propane, natural gas, or electric resistance. Lower rebate level.']
          ]},
          { type: 'callout', kind: 'compliance', title: 'Rep takeaway', text: 'Do not guess the category. Ask fuel type, project scope, backup heat plan, utility sponsor, and home assessment/weatherization status. Misclassifying a project can create customer disappointment and paperwork issues.' }
        ]
      }]
    },
    {
      id: 'hv-m15', number: 15, title: 'Installation Process',
      subtitle: 'What homeowners should expect',
      lessons: [{
        id: 'l1', title: 'The 6-step install timeline', estMinutes: 7,
        body: [
          { type: 'list', title: 'A simple timeline builds trust', items: [
            '1. Discovery call + comfort goals.',
            '2. Site visit/photos + preliminary zone plan.',
            '3. Load review and equipment selection.',
            '4. Proposal with scope, rebates, and financing path.',
            '5. Installation: indoor units, outdoor unit, line set, drain, electrical.',
            '6. Startup, customer training, paperwork, rebate support.'
          ]},
          { type: 'callout', kind: 'tip', title: 'Quality message', text: 'Clean line-set routing, snow clearance, proper drains, and commissioning matter as much as the equipment.' },
          { type: 'callout', kind: 'tip', title: 'Close the loop', text: 'Show the customer how to use modes, temperatures, filters, and schedules.' }
        ]
      }]
    },
    {
      id: 'hv-m16', number: 16, title: 'Price Conversation',
      subtitle: 'How to frame price without discounting too fast',
      lessons: [{
        id: 'l1', title: 'Gross cost to net value', estMinutes: 7,
        body: [
          { type: 'list', title: 'Three-part price conversation', items: [
            '1. Gross project cost — equipment, labor, electrical, line-hide, permits, commissioning, warranty support.',
            '2. Rebates + incentives — Mass Save category, income eligibility, weatherization bonus if applicable, documentation.',
            '3. Net monthly view — HEAT Loan, current fuel costs, comfort improvement, future solar/battery planning.'
          ]},
          { type: 'say', text: '"The important number is not just the sticker price. It is the net cost after verified incentives and what the upgrade does for comfort, fuel use, and home value."' }
        ]
      }]
    },
    {
      id: 'hv-m17', number: 17, title: 'HVAC Objections',
      subtitle: 'Common concerns and rebuttals',
      lessons: [{
        id: 'l1', title: 'Six common objections', estMinutes: 9,
        body: [
          { type: 'table', title: 'Objections & rebuttals', headers: ['Objection', 'Rebuttal approach'], rows: [
            ['"They do not work in cold MA winters."', 'Modern cold-climate heat pumps are designed for low temperatures. The key is correct sizing and weatherization.'],
            ['"My electric bill will explode."', 'Electric use may rise, but oil/propane/gas/electric-resistance use may drop. We compare total energy cost, not one line item.'],
            ['"I only want one unit."', 'That may work in an open area, but closed bedrooms and multiple floors need separate zoning for real comfort.'],
            ['"I do not like wall units."', 'We can review floor-mounted, cassette, or concealed ducted options depending on the home.'],
            ['"It is too expensive."', 'Let’s look at rebates, 0% financing, comfort impact, and what current fuel costs are doing.'],
            ['"Is the rebate guaranteed?"', 'No. We verify eligibility, equipment, contractor rules, paperwork, and deadlines before finalizing net cost.']
          ]},
          { type: 'callout', kind: 'tip', title: 'Delivery style', text: 'Use short, confident answers, then ask a follow-up question to keep the conversation moving.' }
        ]
      }]
    },
    {
      id: 'hv-m18', number: 18, title: 'Consultative Sales Talk Track',
      subtitle: 'A simple consultative pitch',
      lessons: [{
        id: 'l1', title: 'The 5-step talk track', estMinutes: 7,
        body: [
          { type: 'list', title: 'Use this flow for virtual or in-home appointments', items: [
            '1. Open — "What rooms are giving you the biggest comfort issues right now?"',
            '2. Educate — "Mini-splits heat and cool by moving heat, not burning fuel."',
            '3. Diagnose — "Because bedrooms are closed off, we may need separate zones."',
            '4. Position incentives — "We will verify the Mass Save category before showing final net cost."',
            '5. Close next step — "The next step is a site/load review so we can confirm the right zone plan."'
          ]}
        ]
      }]
    },
    {
      id: 'hv-m19', number: 19, title: 'Why Nexis Power',
      subtitle: 'The strongest positioning',
      lessons: [{
        id: 'l1', title: 'Nexis as the energy partner, not just the installer', estMinutes: 6,
        body: [
          { type: 'list', title: 'Positioning pillars', items: [
            'Local Massachusetts energy-market understanding.',
            'Heat pumps, solar, battery, roofing/efficiency conversations under one plan.',
            'Cleaner homeowner experience: discovery, design, incentives, financing, install.',
            'Professional education instead of pressure-selling.',
            'Support with documentation and next steps after installation.'
          ]},
          { type: 'say', text: '"Nexis helps you build the right home energy plan: comfort today, lower energy risk tomorrow."' }
        ]
      }]
    },
    {
      id: 'hv-m20', number: 20, title: 'Practice & Certification Preparation',
      subtitle: 'Roleplay + certification checks',
      lessons: [{
        id: 'l1', title: 'What you need to demonstrate', estMinutes: 8,
        body: [
          { type: 'callout', kind: 'tip', title: 'Certification standard', text: 'A certified rep can explain: system parts, the heating/cooling cycle, zone-count logic, the BTU pre-estimate method, Mass Save categories, and at least 6 common objections.' },
          { type: 'list', title: 'Practice before you present to homeowners', items: [
            'Roleplay 1 — customer has oil heat, no central AC, 1,800 sq. ft. colonial with 4 bedrooms. Estimate likely zones and ask discovery questions.',
            'Roleplay 2 — customer wants one head for the entire house. Explain airflow/zoning without sounding negative.',
            'Roleplay 3 — customer says the quote is too expensive. Reframe net cost, rebates, financing, and comfort.'
          ]},
          { type: 'p', text: 'Complete these in the HVAC Roleplay Center before attempting your final exam. All six scored scenarios there mirror what the certification exam and your manager expect you to handle confidently in the field.' }
        ]
      }]
    }
  ],

  // ---- Supplementary modules added beyond the source manual, per Nexis Power's request
  // to round out gaps a new rep would otherwise hit in the field. Clearly marked as added content. ----
  supplementalNote: 'Modules 21–22 were added by Nexis Power Academy to round out topics the source training deck does not cover in depth: general cold-climate performance concepts and routine homeowner maintenance/warranty talking points. No company-specific figures are invented — only well-established, generic industry concepts.',
  supplementalModules: [
    {
      id: 'hv-m21', number: 21, title: 'Cold-Climate Performance & Efficiency Ratings (Added)',
      subtitle: 'General industry concepts every rep should be able to explain',
      lessons: [{
        id: 'l1', title: 'Cold-climate technology and efficiency labels', estMinutes: 7,
        body: [
          { type: 'callout', kind: 'tip', title: 'Why this module exists', text: 'This module was added by Nexis Power Academy to fill a common knowledge gap: reps are frequently asked general cold-climate and efficiency-rating questions the source deck does not spell out. Content here is generic industry knowledge, not brand-specific specs.' },
          { type: 'list', title: 'Talking points', items: [
            'Cold-climate heat pumps use variable-speed ("inverter-driven") compressors that ramp output up in cold weather instead of simply cycling on/off — this is the general mechanism behind modern low-temperature performance.',
            'Efficiency ratings (like SEER2 for cooling and HSPF2 for heating) are standardized industry labels used to compare equipment efficiency — explain them as general comparison tools, not guaranteed real-world numbers, and never quote a specific rating unless it is confirmed on the actual equipment spec sheet.',
            'Backup heat (existing furnace/boiler or resistance strips) is often kept as a safety net during extreme cold or equipment servicing — this is a normal, expected part of many whole-home and partial-home designs, not a sign the heat pump "doesn’t work."',
            'Reps should never quote a specific low-temperature performance number (e.g., "still delivers X% capacity at Y degrees") unless that figure is confirmed on the manufacturer spec sheet for the specific equipment being proposed.'
          ]}
        ]
      }]
    },
    {
      id: 'hv-m22', number: 22, title: 'Maintenance & Warranty Talking Points (Added)',
      subtitle: 'What reps can safely tell homeowners about upkeep',
      lessons: [{
        id: 'l1', title: 'Simple homeowner-facing maintenance education', estMinutes: 6,
        body: [
          { type: 'callout', kind: 'tip', title: 'Why this module exists', text: 'Added to give reps confident, compliant talking points about post-install upkeep — a frequent homeowner question not covered in the source deck.' },
          { type: 'list', title: 'What a rep can safely say', items: [
            'Indoor filters should be checked and cleaned periodically — this is routine homeowner-level upkeep, not a professional service call.',
            'Keep the outdoor condenser clear of snow, ice buildup, leaves, and debris so airflow is not restricted.',
            'Refrigerant handling, electrical work, and diagnostic servicing must always be performed by a licensed HVAC technician — reps never advise a homeowner to service refrigerant or electrical components themselves.',
            'Warranty terms (parts, labor, compressor coverage) vary by manufacturer and by the specific install — reps should point the customer to the actual written warranty documentation for their equipment rather than stating warranty terms from memory.'
          ]},
          { type: 'callout', kind: 'compliance', title: 'Compliance reminder', text: 'Never state a specific warranty length or coverage detail unless you are reading it directly from the approved documentation for that exact equipment and install.' }
        ]
      }]
    }
  ]
};

// Fold supplemental modules into the main modules array (numbered continuation) so the
// rest of the app can treat HVAC_COURSE.modules as the single source of truth.
HVAC_COURSE.modules = HVAC_COURSE.modules.concat(HVAC_COURSE.supplementalModules);

window.HVAC_COURSE = HVAC_COURSE;
