// ============================================================
// docuseal-send — Supabase Edge Function
//
// Creates a DocuSeal submission for one onboarding document and has
// DocuSeal email it directly to the representative to fill out and
// sign. The DocuSeal API key lives ONLY here as a function secret; it
// is never sent to the browser. This function never sees the signed
// document's contents (SSN, EIN, bank/routing numbers, etc.) — it only
// tells DocuSeal who to send which template to, and records DocuSeal's
// own opaque submission id + a status ('sent') back in Postgres.
//
// Deploy:
//   supabase functions deploy docuseal-send
// Secrets (set once):
//   supabase secrets set DOCUSEAL_API_KEY=your_docuseal_api_key
//   # Only if self-hosting DocuSeal (skip for DocuSeal cloud):
//   supabase secrets set DOCUSEAL_BASE_URL=https://your-docuseal-host/api
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DOCUSEAL_API_KEY = Deno.env.get('DOCUSEAL_API_KEY')!;
const DOCUSEAL_BASE_URL = Deno.env.get('DOCUSEAL_BASE_URL') || 'https://api.docuseal.com';

// Always resolves with HTTP 200 (even for "expected" failures like bad auth
// or a missing template) and puts the real outcome in the JSON body's `ok`
// field instead. Supabase's client SDK treats any non-2xx response as a
// generic FunctionsHttpError with a hardcoded message ("Edge Function
// returned a non-2xx status code") and doesn't reliably expose the body
// behind it, so a non-2xx status is how our actual error text was getting
// swallowed client-side. A genuinely unexpected crash still falls through
// to Deno's own 500 with no JSON body, which is the one case the client
// truly can't get a specific message for.
// Deno.serve does NOT answer CORS preflight (OPTIONS) requests on its own,
// and a response with no Access-Control-Allow-* headers makes the browser
// block the real request that follows it. These headers go on every
// response, including OPTIONS.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
function fail(error: string) {
  return json({ ok: false, error: error });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail('Method not allowed');
  if (!DOCUSEAL_API_KEY) return fail('DOCUSEAL_API_KEY is not configured on this function.');

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer /, '');
  if (!jwt) return fail('Missing Authorization header');

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userRes, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userRes.user) return fail('Invalid session');
  const callerId = userRes.user.id;

  let payload: { userId?: string; docKey?: string };
  try {
    payload = await req.json();
  } catch {
    return fail('Invalid JSON body');
  }
  const targetUserId = payload.userId;
  const docKey = payload.docKey;
  if (!targetUserId || !docKey) return fail('userId and docKey are required');

  // A rep may only send their own documents; staff may send any rep's.
  if (callerId !== targetUserId) {
    const { data: callerProfile } = await db.from('profiles').select('role').eq('id', callerId).maybeSingle();
    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'manager')) {
      return fail('Not authorized to send this document');
    }
  }

  const { data: template } = await db.from('docuseal_templates').select('template_id').eq('doc_key', docKey).maybeSingle();
  if (!template) {
    return fail('No DocuSeal template configured for "' + docKey + '" yet. An admin needs to set it up in Admin → Onboarding → E-Signature Templates.');
  }

  const { data: profile } = await db.from('profiles').select('name, email').eq('id', targetUserId).maybeSingle();
  const { data: intake } = await db
    .from('onboarding_profile')
    .select('personal_email, legal_first_name, legal_last_name')
    .eq('user_id', targetUserId)
    .maybeSingle();

  const signerEmail = (intake && intake.personal_email) || (profile && profile.email);
  const signerName =
    intake && intake.legal_first_name
      ? (intake.legal_first_name + ' ' + (intake.legal_last_name || '')).trim()
      : profile
        ? profile.name
        : '';
  if (!signerEmail) {
    return fail('This representative has no email on file yet — ask them to submit Personal Information first.');
  }

  let dsRes: Response;
  try {
    dsRes = await fetch(DOCUSEAL_BASE_URL + '/submissions', {
      method: 'POST',
      headers: { 'X-Auth-Token': DOCUSEAL_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: template.template_id,
        send_email: true,
        submitters: [
          {
            role: 'First Party',
            email: signerEmail,
            name: signerName,
            external_id: targetUserId + ':' + docKey
          }
        ]
      })
    });
  } catch (e) {
    return fail('Could not reach DocuSeal: ' + (e instanceof Error ? e.message : String(e)));
  }

  const dsBody = await dsRes.json().catch(() => ({}));
  if (!dsRes.ok) {
    return fail('DocuSeal error: ' + (dsBody?.error || dsRes.statusText));
  }

  // DocuSeal's create-submission response has varied slightly across
  // versions/clients in third-party examples we could confirm; handle the
  // common shapes defensively and log the raw body so the actual shape is
  // visible in `supabase functions logs docuseal-send` on the first real send.
  console.log('DocuSeal submission response:', JSON.stringify(dsBody));
  const first = Array.isArray(dsBody) ? dsBody[0] : dsBody;
  const submissionId = first?.submission_id ?? first?.id ?? null;

  await db.from('onboarding_documents').upsert(
    {
      user_id: targetUserId,
      doc_key: docKey,
      status: 'sent',
      docuseal_submission_id: submissionId != null ? String(submissionId) : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,doc_key' }
  );

  await db.from('onboarding_audit_log').insert({
    user_id: targetUserId,
    action: 'Sent for signature via DocuSeal: ' + docKey,
    actor: callerId,
    result: 'SENT'
  });

  return json({ ok: true, submissionId });
});
