// ============================================================
// notify-new-task — Supabase Edge Function
//
// Emails every admin via HighLevel when a new HR/Compliance task is
// opened (classification review, legal/compliance escalation, etc.),
// so it doesn't just sit unseen in the Task Inbox until someone opens
// the Admin -> Onboarding dashboard. Called by the client right after
// dbOpenOnboardingTask() succeeds -- the task row itself (in
// onboarding_tasks) remains the source of truth; this is best-effort.
//
// Deploy:
//   supabase functions deploy notify-new-task
// Secrets (shared with send-onboarding-reminders):
//   supabase secrets set HIGHLEVEL_API_KEY=your_highlevel_private_integration_token
//   supabase secrets set HIGHLEVEL_LOCATION_ID=your_highlevel_location_id
// Optional:
//   supabase secrets set ACADEMY_URL=https://josueleto77.github.io/nexis-academy/
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { sendHighLevelEmail } from './_shared/highlevel.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HIGHLEVEL_API_KEY = Deno.env.get('HIGHLEVEL_API_KEY')!;
const HIGHLEVEL_LOCATION_ID = Deno.env.get('HIGHLEVEL_LOCATION_ID')!;
const ACADEMY_URL = Deno.env.get('ACADEMY_URL') || 'https://josueleto77.github.io/nexis-academy/';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}
function fail(error: string) {
  return json({ ok: false, error: error });
}
// title/detail/repName can contain rep-typed free text (e.g. an onboarding
// FAQ question) that ends up inside an HTML email -- escape it.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail('Method not allowed');
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    return fail('HIGHLEVEL_API_KEY / HIGHLEVEL_LOCATION_ID not configured on this function.');
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer /, '');
  if (!jwt) return fail('Missing Authorization header');

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userRes, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userRes.user) return fail('Invalid session');

  let payload: { taskType?: string; title?: string; detail?: string; urgency?: string; repName?: string };
  try {
    payload = await req.json();
  } catch {
    return fail('Invalid JSON body');
  }
  // title stays raw for the plain-text email subject; the *Html variants are
  // for interpolating into the HTML body, where rep-typed free text (e.g. an
  // onboarding FAQ question) needs escaping.
  const title = (payload.title || '').trim();
  if (!title) return fail('title is required');
  const detail = payload.detail || '';
  const urgency = payload.urgency || 'normal';
  const repName = payload.repName || 'A representative';
  const titleHtml = escapeHtml(title);
  const detailHtml = escapeHtml(detail);
  const repNameHtml = escapeHtml(repName);

  const { data: admins, error: adminsErr } = await db.from('profiles').select('name, email').eq('role', 'admin');
  if (adminsErr) return fail(adminsErr.message);
  if (!admins || !admins.length) return json({ ok: true, notified: 0, warning: 'No admin accounts found.' });

  const html =
    '<p>' + (urgency === 'urgent' ? '<strong>[URGENT]</strong> ' : '') + 'A new onboarding task was opened for ' + repNameHtml + ':</p>' +
    '<p><strong>' + titleHtml + '</strong></p>' +
    (detailHtml ? '<p>' + detailHtml + '</p>' : '') +
    '<p><a href="' + ACADEMY_URL + '#/admin/onboarding">Open the Onboarding dashboard</a></p>';

  let notified = 0;
  const failures: string[] = [];
  for (const admin of admins) {
    if (!admin.email) continue;
    const result = await sendHighLevelEmail({
      apiKey: HIGHLEVEL_API_KEY,
      locationId: HIGHLEVEL_LOCATION_ID,
      toEmail: admin.email,
      toName: admin.name,
      subject: (urgency === 'urgent' ? '[URGENT] ' : '') + 'New onboarding task: ' + title,
      html: html
    });
    if (result.ok) notified++; else failures.push(admin.email + ': ' + result.error);
  }

  return json({ ok: true, notified: notified, failures: failures.length ? failures : undefined });
});
