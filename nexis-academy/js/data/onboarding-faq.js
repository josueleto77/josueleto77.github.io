/* ============================================================
   Nexis Onboarding FAQ knowledge base — general company/process
   information only. Every entry that touches a topic covered by
   Massachusetts consumer-protection or door-to-door sales rules
   carries the same compliance guardrail language reps are taught in
   the Academy. This bot is an onboarding/compliance assistant, not a
   lawyer, accountant, or immigration adviser: nothing here is
   individualized legal, tax, or immigration advice, and anything
   uncertain routes to a Legal/Compliance Review task instead of a
   guess (see section 30/31 of the onboarding spec).
   ============================================================ */
var ONBOARDING_FAQ = [
  { q: 'Who is Nexis Power?', a: 'Nexis Power LLC is a Massachusetts-based solar, HVAC, roofing, electrical, and home-energy company. The Academy trains and certifies our Solar and HVAC sales representatives.' },
  { q: 'How is W-2 vs 1099 classification decided?', a: 'Classification is decided by management/HR, never by the rep or by this assistant. Massachusetts has strict worker-classification rules. If your classification shows "Pending HR Review," a Classification Review task has already been opened for HR — no action needed from you until it’s resolved.' },
  { q: 'Does receiving commissions make me a 1099 contractor?', a: 'No. Compensation structure alone does not determine classification. Classification is a Massachusetts-law determination made by management/HR, not something implied by how you’re paid.' },
  { q: 'Where do I enter my SSN or bank account number?', a: 'Nowhere in this chat or form. Social Security and banking details are collected only through the secure payroll/QuickBooks setup process, never typed into onboarding chat or forms. If anything here ever asks you to type an SSN or full bank/routing number directly, stop and contact HR.' },
  { q: 'What can I say about savings at the door or on a call?', a: 'Never promise a specific savings percentage (e.g. "you will definitely save 50%"). Use language tied to that customer’s actual numbers, e.g. "Based on your usage, utility rate, system production, and financing structure, the proposal estimates…" Exact phrasing is covered in Massachusetts Compliance training.' },
  { q: 'Can I tell a homeowner they qualify for the tax credit?', a: 'Never state a homeowner "qualifies" for a tax credit. Say federal or state tax incentives may be available depending on eligibility, and that they should consult a qualified tax professional about their individual situation. This assistant does not give individualized tax advice, and neither do you.' },
  { q: 'Can I guarantee a Mass Save rebate?', a: 'Never guarantee a Mass Save rebate unless eligibility has already been confirmed for that specific customer. Rebate programs and amounts change — always check the current Mass Save Program Database before quoting a figure.' },
  { q: 'Can I say something is "free"?', a: 'Only describe something as "free" if an approved company promotion actually makes it free under the stated conditions. Never use "free" loosely to close a deal.' },
  { q: 'Can I say I was sent by the utility (Eversource / National Grid)?', a: 'No. Never imply you work for the utility or claim you were "sent by" Eversource or National Grid unless that is factually true and authorized. Always identify yourself and Nexis Power and state the commercial purpose of your visit or call.' },
  { q: 'What do I do if a homeowner says "don’t call me again"?', a: 'Immediately record the request through the Nexis Power suppression workflow in the CRM. Never manually bypass a Do Not Call block, and never call a suppressed number again.' },
  { q: 'What are my cancellation-rights obligations?', a: 'Massachusetts home-improvement contracts generally carry a three-business-day cancellation (rescission) right when applicable. Always explain cancellation rights accurately using the approved contract language, and never begin covered work before required cancellation periods, permits, or internal approvals are satisfied.' },
  { q: 'Can I modify the contract language myself?', a: 'No. Home improvement contracts must use the approved Nexis Power templates. Sales representatives may never modify required contract language without management approval.' },
  { q: 'How do heat pump / Mass Save rebates work?', a: 'Rebate amounts, eligibility, and program status change over time and are tracked in the Mass Save Program Database (Academy → Resources → Mass Save Programs), which is the source of truth — not memory. Never guarantee a specific rebate amount without checking it there first.' },
  { q: 'When are commissions paid, and how are they calculated?', a: 'Commission calculation, eligibility, payment schedule, chargebacks, and cancellation effects come from your specific assigned Compensation Plan — reviewed and acknowledged during onboarding. This assistant does not invent compensation rules; if your plan seems to conflict with something you were told, that gets escalated to management rather than guessed at.' },
  { q: 'How do I create a lead or update a deal in HubSpot?', a: 'Full CRM training — leads, contacts, deals, pipelines, appointment outcomes, and data-privacy handling — is part of your onboarding’s HubSpot / CRM training module, required before production CRM access is granted.' },
  { q: 'What happens after a sale?', a: 'Lead → Contact → Qualification ← Appointment → Site assessment → Proposal → Contract → Project handoff → Installation → Inspection → PTO / Completion. Design, permitting, interconnection, and installation are handled by their respective internal teams, not the sales rep.' },
  { q: 'What happens if the homeowner sells their house?', a: 'This depends on the financing structure (cash, loan, PPA, or lease) and is covered in the Financing module of your training — transfer requirements differ by product. Never state a blanket answer to a customer without pointing to the specific financing agreement terms.' }
];

function tokenizeOnboarding(s) {
  var stop = ['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'or', 'in', 'on', 'for', 'what', 'how', 'do', 'does', 'i', 'my', 'you', 'your', 'can', 'should', 'it', 'this', 'that', 'be', 'with', 'as', 'at', 'if', 'not'];
  return (s.toLowerCase().match(/[a-z0-9%]+/g) || []).filter(function (w) { return w.length > 2 && stop.indexOf(w) === -1; });
}
function searchOnboardingFaq(query) {
  var terms = tokenizeOnboarding(query);
  if (!terms.length) return [];
  var scored = ONBOARDING_FAQ.map(function (entry) {
    var hay = (entry.q + ' ' + entry.a).toLowerCase();
    var score = 0;
    terms.forEach(function (t) { if (hay.indexOf(t) !== -1) score++; });
    return { entry: entry, score: score };
  }).filter(function (s) { return s.score > 0; });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, 2).map(function (s) { return s.entry; });
}
