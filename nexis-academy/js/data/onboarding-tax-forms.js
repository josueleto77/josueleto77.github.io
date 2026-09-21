/* ============================================================
   Fillable W-4 / Massachusetts M-4 / W-9 field definitions.

   Every field here is non-sensitive. The SSN (W-4/M-4) and SSN-or-EIN
   (W-9) fields are deliberately NOT defined anywhere in this file --
   those are collected directly and securely through the payroll/
   QuickBooks setup process with HR, never through this app. Per the
   onboarding policy that "company documents remain in their legally
   approved language/version," these forms are presented in English
   only regardless of the onboarding wizard's language toggle.
   ============================================================ */
window.ONBOARDING_TAX_FORMS = {
  w4: {
    title: 'IRS Form W-4 — Employee’s Withholding Certificate',
    docKey: 'w4',
    note: 'Your Social Security Number is not collected here — it is provided directly and securely through the payroll setup process with HR. This is the official federal form; it is presented in English only.',
    fields: [
      { key: 'filing_status', label: 'Step 1(c) — Filing Status', type: 'select', required: true, options: [
        ['single', 'Single or Married filing separately'],
        ['married_jointly', 'Married filing jointly (or Qualifying surviving spouse)'],
        ['head_of_household', 'Head of Household']
      ] },
      { key: 'multiple_jobs', label: 'Step 2(c) — Multiple Jobs or Spouse Works box', type: 'checkbox' },
      { key: 'qualifying_children', label: 'Step 3 — Number of Qualifying Children Under Age 17', type: 'number', min: 0 },
      { key: 'other_dependents', label: 'Step 3 — Number of Other Dependents', type: 'number', min: 0 },
      { key: 'other_income', label: 'Step 4(a) — Other Income (not from jobs)', type: 'number', min: 0, prefix: '$' },
      { key: 'deductions', label: 'Step 4(b) — Deductions', type: 'number', min: 0, prefix: '$' },
      { key: 'extra_withholding', label: 'Step 4(c) — Extra Withholding per Pay Period', type: 'number', min: 0, prefix: '$' }
    ]
  },
  m4: {
    title: 'Massachusetts Form M-4 — Employee’s Withholding Exemption Certificate',
    docKey: 'm4',
    note: 'Your Social Security Number is not collected here — it is provided directly and securely through the payroll setup process with HR. This is the official Massachusetts DOR form; it is presented in English only.',
    fields: [
      { key: 'personal_exemptions', label: 'Line 1 — Number of Personal Exemptions', type: 'number', min: 0 },
      { key: 'dependents', label: 'Line 2 — Number of Dependents', type: 'number', min: 0 },
      { key: 'age_blind_exemptions', label: 'Line 3 — Additional Exemptions (Age 65+ / Blindness)', type: 'number', min: 0 },
      { key: 'additional_withholding', label: 'Line 5 — Additional Withholding Amount per Pay Period', type: 'number', min: 0, prefix: '$' },
      { key: 'exempt_status', label: 'Line 6 — I am claiming exempt status', type: 'checkbox' },
      { key: 'exempt_reason', label: 'Reason for Exempt Status (if applicable)', type: 'text' }
    ]
  },
  w9: {
    title: 'IRS Form W-9 — Request for Taxpayer Identification Number and Certification',
    docKey: 'w9',
    note: 'Your SSN or EIN is not collected here — it is provided directly and securely through the secure QuickBooks/payment setup process with HR. This is the official federal form; it is presented in English only.',
    fields: [
      { key: 'business_name', label: 'Business Name (if different from your legal name)', type: 'text' },
      { key: 'tax_classification', label: 'Federal Tax Classification', type: 'select', required: true, options: [
        ['individual', 'Individual / Sole Proprietor'],
        ['c_corp', 'C Corporation'],
        ['s_corp', 'S Corporation'],
        ['partnership', 'Partnership'],
        ['trust_estate', 'Trust / Estate'],
        ['llc', 'Limited Liability Company'],
        ['other', 'Other']
      ] },
      { key: 'llc_tax_classification', label: 'If LLC — Tax Classification (C, S, or P)', type: 'text' },
      { key: 'exempt_payee_code', label: 'Exempt Payee Code (if applicable)', type: 'text' },
      { key: 'certify', label: 'I certify, under penalties of perjury, that the information provided is true, correct, and complete to the best of my knowledge.', type: 'checkbox', required: true }
    ]
  }
};
