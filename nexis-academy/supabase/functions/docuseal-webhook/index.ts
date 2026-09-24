// ============================================================
// docuseal-webhook — Supabase Edge Function
//
// Public endpoint DocuSeal calls when a signing event happens (a rep
// signs, or a whole submission is fully executed). It never receives
// document content — DocuSeal's webhook payload carries only status
// metadata plus the external_id we set when sending the document
// (see docuseal-send), which is "<userId>:<docKey>". This function
// uses that to flip the matching onboarding_documents row's status.
//
// Deploy (note --no-verify-jwt: DocuSeal is not a logged-in Supabase
// user, so Supabase's own gateway must not require a Supabase JWT here):
//   supabase functions deploy docuseal-webhook --no-verify-jwt
//
// Then in DocuSeal -> Settings -> Webhooks, point the webhook URL at:
//   https://<project-ref>.supabase.co/functions/v1/docuseal-webhook
// for the "form.completed" and "submission.completed" events (add
// "form.declined" / "submission.expired" too if you want rejections
// tracked automatically).
//
// Optional shared-secret check: if DocuSeal's webhook config lets you
// add a custom header, set DOCUSEAL_WEBHOOK_SECRET here and configure
// DocuSeal to send the same value in an `x-webhook-secret` header.
// Leave the secret unset to skip this check.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('DOCUSEAL_WEBHOOK_SECRET');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (WEBHOOK_SECRET) {
    const provided = req.headers.get('x-webhook-secret') || req.headers.get('authorization') || '';
    if (provided !== WEBHOOK_SECRET && provided !== 'Bearer ' + WEBHOOK_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  console.log('DocuSeal webhook payload:', JSON.stringify(payload));

  const eventType: string = payload.event_type || payload.event || '';
  const data = payload.data || payload;
  const submitter = data.submitter || data;
  const externalId: string | undefined = submitter?.external_id || data?.external_id;

  if (!externalId || externalId.indexOf(':') === -1) {
    // Nothing we can map back to a rep/document -- acknowledge and ignore
    // rather than error, so DocuSeal doesn't keep retrying forever.
    return json({ ok: true, ignored: true, reason: 'no matching external_id' });
  }
  const sepIdx = externalId.indexOf(':');
  const userId = externalId.slice(0, sepIdx);
  const docKey = externalId.slice(sepIdx + 1);

  let status: string | null = null;
  if (eventType === 'form.completed') status = 'received';
  else if (eventType === 'submission.completed') status = 'verified';
  else if (eventType === 'form.declined' || eventType === 'submission.expired') status = 'rejected';

  if (!status) return json({ ok: true, ignored: true, eventType });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { user_id: userId, doc_key: docKey, status, updated_at: nowIso };
  if (status === 'received') patch.received_at = nowIso;
  if (status === 'verified') patch.verified_at = nowIso;

  await db.from('onboarding_documents').upsert(patch, { onConflict: 'user_id,doc_key' });
  await db.from('onboarding_audit_log').insert({
    user_id: userId,
    action: 'DocuSeal event: ' + eventType + ' (' + docKey + ')',
    actor: null,
    result: status.toUpperCase()
  });

  return json({ ok: true });
});
