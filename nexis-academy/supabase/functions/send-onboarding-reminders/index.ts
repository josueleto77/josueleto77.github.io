// ============================================================
// send-onboarding-reminders — Supabase Edge Function
//
// Emails every rep who started onboarding but hasn't submitted their
// Personal Information yet, via HighLevel. Meant to run on a schedule
// (Supabase Cron -> pg_cron/pg_net), not from the browser -- there's no
// user session here, so it's protected by a shared secret header
// instead of a Supabase JWT.
//
// Mirrors the in-app reminder banner's own threshold (2+ days since
// onboarding_profile was created, i.e. since the account was set up),
// but re-sends at most once every 2 days per rep (checked against the
// last "Reminder email sent" entry in onboarding_audit_log) so this
// doesn't email someone daily forever.
//
// Deploy:
//   supabase functions deploy send-onboarding-reminders --no-verify-jwt
// Secrets (set once):
//   supabase secrets set CRON_SECRET=<same value used in the cron job's x-cron-secret header>
//   supabase secrets set HIGHLEVEL_API_KEY=your_highlevel_private_integration_token
//   supabase secrets set HIGHLEVEL_LOCATION_ID=your_highlevel_location_id
// Optional:
//   supabase secrets set ACADEMY_URL=https://josueleto77.github.io/nexis-academy/
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { sendHighLevelEmail } from './_shared/highlevel.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const HIGHLEVEL_API_KEY = Deno.env.get('HIGHLEVEL_API_KEY')!;
const HIGHLEVEL_LOCATION_ID = Deno.env.get('HIGHLEVEL_LOCATION_ID')!;
const ACADEMY_URL = Deno.env.get('ACADEMY_URL') || 'https://josueleto77.github.io/nexis-academy/';

const REMINDER_AFTER_DAYS = 2;
const RESEND_EVERY_DAYS = 2;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
// profile.name is rep-supplied free text ending up inside an HTML email.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    return json({ error: 'HIGHLEVEL_API_KEY / HIGHLEVEL_LOCATION_ID not configured on this function.' }, 500);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: pending, error: pendingErr } = await db
    .from('onboarding_profile')
    .select('user_id, created_at, profiles!onboarding_profile_user_id_fkey(name, email, role)')
    .is('intake_submitted_at', null);
  if (pendingErr) return json({ error: pendingErr.message }, 500);

  const now = Date.now();
  const results: Array<{ userId: string; sent: boolean; reason?: string }> = [];

  for (const row of pending || []) {
    const profile = (row as any).profiles;
    if (!profile || profile.role !== 'rep' || !profile.email) continue;

    const daysSinceStart = Math.floor((now - new Date(row.created_at).getTime()) / 86400000);
    if (daysSinceStart < REMINDER_AFTER_DAYS) {
      results.push({ userId: row.user_id, sent: false, reason: 'not due yet' });
      continue;
    }

    const { data: lastReminder } = await db
      .from('onboarding_audit_log')
      .select('at')
      .eq('user_id', row.user_id)
      .eq('action', 'Reminder email sent via HighLevel')
      .order('at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastReminder) {
      const daysSinceLastReminder = Math.floor((now - new Date(lastReminder.at).getTime()) / 86400000);
      if (daysSinceLastReminder < RESEND_EVERY_DAYS) {
        results.push({ userId: row.user_id, sent: false, reason: 'reminded recently' });
        continue;
      }
    }

    const firstName = escapeHtml((profile.name || '').split(' ')[0] || 'there');
    const html =
      '<p>Hi ' + firstName + ',</p>' +
      '<p>It’s been ' + daysSinceStart + ' days since you started your Nexis Power onboarding, and we still don’t have your Personal Information on file.</p>' +
      '<p>Please take a couple of minutes to complete it so we can keep moving you toward Ready to Sell:</p>' +
      '<p><a href="' + ACADEMY_URL + '#/onboarding">Complete your onboarding</a></p>' +
      '<p>— Nexis Power</p>';

    const result = await sendHighLevelEmail({
      apiKey: HIGHLEVEL_API_KEY,
      locationId: HIGHLEVEL_LOCATION_ID,
      toEmail: profile.email,
      toName: profile.name,
      subject: 'Finish your Nexis Power onboarding',
      html: html
    });

    await db.from('onboarding_audit_log').insert({
      user_id: row.user_id,
      action: 'Reminder email sent via HighLevel',
      actor: null,
      result: result.ok ? 'SENT' : 'FAILED: ' + result.error
    });

    results.push({ userId: row.user_id, sent: result.ok, reason: result.ok ? undefined : result.error });
  }

  return json({ ok: true, checked: (pending || []).length, results: results });
});
