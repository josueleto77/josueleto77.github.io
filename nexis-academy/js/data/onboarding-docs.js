/* ============================================================
   Nexis Power Onboarding — required checklist items per approved
   worker classification. Every item here is tracked as a TYPE +
   STATUS only (see onboarding_documents in schema.sql) -- never as
   file contents, SSNs, or banking details. "Optional" items are
   collected only when the role/company policy requires them and
   don't block Ready to Sell on their own.

   `viaDocuseal: true` marks the items that are sent, filled out, and
   signed entirely inside Nexis Power's e-signature platform (DocuSeal)
   -- the contract, W-4, M-4, W-9, and banking/direct-deposit setup.
   Nothing about their contents (including SSN, EIN, or bank/routing
   numbers) ever passes through this app; see js/pages/render-onboarding.js
   (onbSendForSignature) and supabase/functions/docuseal-send.
   ============================================================ */
window.ONBOARDING_DOCS = {
  w2_employee: [
    { key: 'i9', label: 'Form I-9 — Employment Eligibility Verification', category: 'Identity / Employment Eligibility' },
    { key: 'w4', label: 'IRS Form W-4', category: 'Federal Tax', viaDocuseal: true },
    { key: 'm4', label: 'Massachusetts Form M-4', category: 'Massachusetts Tax', viaDocuseal: true },
    { key: 'direct_deposit', label: 'Payroll / Direct Deposit Setup', category: 'Payroll', viaDocuseal: true },
    { key: 'employment_agreement', label: 'Nexis Power Employment Agreement', category: 'Company Agreements', viaDocuseal: true },
    { key: 'compensation_plan', label: 'Compensation Plan Acknowledgment', category: 'Company Agreements' },
    { key: 'commission_agreement', label: 'Commission Agreement', category: 'Company Agreements' },
    { key: 'employee_handbook', label: 'Employee Handbook Acknowledgment', category: 'Company Policies' },
    { key: 'code_of_conduct', label: 'Code of Conduct', category: 'Company Policies' },
    { key: 'confidentiality_agreement', label: 'Confidentiality Agreement / NDA', category: 'Company Policies' },
    { key: 'infosec_policy', label: 'Information Security Policy', category: 'Company Policies' },
    { key: 'acceptable_use_policy', label: 'Acceptable Use / Technology Policy', category: 'Company Policies' },
    { key: 'crm_usage_policy', label: 'CRM Usage Policy', category: 'Company Policies' },
    { key: 'lead_ownership_policy', label: 'Lead Ownership Policy', category: 'Company Policies' },
    { key: 'customer_privacy_policy', label: 'Customer Privacy Policy', category: 'Company Policies' },
    { key: 'eeo_policy', label: 'Equal Employment Opportunity / Anti-Harassment Policy', category: 'Company Policies' },
    { key: 'safety_policy', label: 'Safety Policy', category: 'Company Policies' },
    { key: 'sales_compliance_policy', label: 'Sales Compliance Policy', category: 'Company Policies' }
  ],
  '1099_contractor': [
    { key: 'w9', label: 'IRS Form W-9', category: 'Tax', viaDocuseal: true },
    { key: 'contractor_agreement', label: 'Independent Contractor Agreement', category: 'Company Agreements', viaDocuseal: true },
    { key: 'compensation_agreement', label: 'Compensation Agreement', category: 'Company Agreements' },
    { key: 'confidentiality_agreement', label: 'Confidentiality Agreement / NDA', category: 'Company Policies' },
    { key: 'code_of_conduct', label: 'Code of Conduct', category: 'Company Policies' },
    { key: 'sales_compliance_agreement', label: 'Sales Compliance Agreement', category: 'Company Policies' },
    { key: 'crm_data_security_agreement', label: 'CRM / Data Security Agreement', category: 'Company Policies' },
    { key: 'payment_setup', label: 'Payment Method / Direct Deposit Setup', category: 'Payment', viaDocuseal: true }
  ]
};

function onboardingDocsFor(classification) {
  return window.ONBOARDING_DOCS[classification] || [];
}
