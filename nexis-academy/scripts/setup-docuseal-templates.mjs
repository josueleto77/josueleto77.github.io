#!/usr/bin/env node
// ============================================================
// setup-docuseal-templates.mjs
//
// Run this ONCE, locally, on your own machine -- never in a shared
// chat or CI log -- to create the 3 official-government-form
// templates in DocuSeal (W-4, W-9, Massachusetts M-4) from the real
// PDFs published by the IRS and Mass DOR.
//
// Your DOCUSEAL_API_KEY stays on your machine the whole time; this
// script never sends it anywhere except DocuSeal's own API.
//
// Usage:
//   DOCUSEAL_API_KEY=your_key node scripts/setup-docuseal-templates.mjs
//
// Optional (only if self-hosting DocuSeal instead of the cloud):
//   DOCUSEAL_BASE_URL=https://your-docuseal-host/api DOCUSEAL_API_KEY=... node scripts/setup-docuseal-templates.mjs
//
// What this does NOT do: place signature/date fields on the page for
// you. DocuSeal's API needs exact x/y coordinates for that, which this
// script has no reliable way to know for an arbitrary PDF. After it
// creates each template, open it in the DocuSeal editor and drag on a
// Signature field + Date field (and a Text field per line for W-4/M-4/
// W-9 if you want those pre-fillable) before using it -- same as you'd
// do uploading the PDF by hand, just without the upload step.
//
// The other 4 documents (Employment Agreement, Contractor Agreement,
// Direct Deposit, Payment Setup) are your own internal files, not
// public government forms, so this script can't fetch them for you --
// create those the normal way in the DocuSeal UI.
// ============================================================

const API_KEY = process.env.DOCUSEAL_API_KEY;
const BASE_URL = process.env.DOCUSEAL_BASE_URL || 'https://api.docuseal.com';

if (!API_KEY) {
  console.error('Missing DOCUSEAL_API_KEY. Run: DOCUSEAL_API_KEY=your_key node scripts/setup-docuseal-templates.mjs');
  process.exit(1);
}

const FORMS = [
  {
    name: 'IRS W-4 — Employee’s Withholding Certificate',
    fileName: 'irs-w4.pdf',
    url: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf'
  },
  {
    name: 'IRS W-9 — Request for Taxpayer ID',
    fileName: 'irs-w9.pdf',
    url: 'https://www.irs.gov/pub/irs-pdf/fw9.pdf'
  },
  {
    name: 'MA DOR — Form M-4',
    fileName: 'ma-m4.pdf',
    url: 'https://www.mass.gov/doc/form-m-4-massachusetts-employees-withholding-exemption-certificate/download'
  }
];

async function downloadAsBase64(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('Download failed (' + res.status + '): ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}

async function createTemplate(form, base64) {
  const res = await fetch(BASE_URL + '/templates/pdf', {
    method: 'POST',
    headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.name,
      documents: [{ name: form.fileName, file: base64 }]
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('DocuSeal error (' + res.status + '): ' + (body.error || JSON.stringify(body)));
  return body;
}

(async () => {
  console.log('Base URL:', BASE_URL);
  const results = [];
  for (const form of FORMS) {
    process.stdout.write('Downloading ' + form.fileName + ' ... ');
    let base64;
    try {
      base64 = await downloadAsBase64(form.url);
      console.log('ok (' + Math.round((base64.length * 3) / 4 / 1024) + ' KB)');
    } catch (e) {
      console.log('FAILED: ' + e.message);
      console.log('  -> Download it yourself from ' + form.url + ' and create the template manually instead.');
      continue;
    }

    process.stdout.write('Creating DocuSeal template "' + form.name + '" ... ');
    try {
      const tpl = await createTemplate(form, base64);
      const id = tpl.id ?? (Array.isArray(tpl) ? tpl[0]?.id : undefined);
      console.log('ok (template_id: ' + id + ')');
      results.push({ name: form.name, template_id: id });
    } catch (e) {
      console.log('FAILED: ' + e.message);
    }
  }

  console.log('\n=== Summary ===');
  if (!results.length) {
    console.log('No templates were created. Check the errors above.');
    return;
  }
  results.forEach((r) => console.log(r.name + ' -> template_id: ' + r.template_id));
  console.log('\nNext steps:');
  console.log('1. Open each template above in the DocuSeal editor and place a Signature field + Date field on it.');
  console.log('2. Paste each template_id into Admin -> Onboarding -> E-Signature Templates in the Academy (rows: w4, w9, m4).');
  console.log('3. Still create the other 4 templates by hand in DocuSeal (Employment Agreement, Contractor Agreement, Direct Deposit, Payment Setup) -- see the setup PDF for details.');
})();
