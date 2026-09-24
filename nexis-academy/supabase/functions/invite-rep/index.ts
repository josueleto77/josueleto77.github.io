// ============================================================
// invite-rep — Supabase Edge Function
//
// Admin-only: whitelists an email in the `invites` table (same as
// the client used to do directly) AND sends that person a real
// invitation email via Supabase Auth's own admin.inviteUserByEmail,
// so they no longer have to be told by hand to go sign up. The email
// is sent from Supabase's already-configured Auth email service --
// no third-party email provider needed.
//
// Requires the service role key, so it can't run in the browser.
//
// Deploy:
//   supabase functions deploy invite-rep
// Optional secret (defaults to the GitHub Pages URL if unset):
//   supabase secrets set ACADEMY_URL=https://josueleto77.github.io/nexis-academy/
//
// Known Supabase issue (as of Sep 2026, supabase/supabase#50801): on
// projects using the new sb_secret_... key format, the auto-injected
// SUPABASE_SERVICE_ROLE_KEY silently fails for auth.admin.* calls
// specifically (the API gateway can't mint a service_role JWT from it),
// even though it works fine for everything else. The documented
// workaround is to use the LEGACY service_role JWT for this. If you're
// hitting that, get the legacy service_role key from Project Settings ->
// API Keys -> Legacy API Keys, and set it here (never share this value
// outside Supabase's own secret store -- it bypasses all RLS):
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY_LEGACY=your_legacy_jwt
// This function prefers that secret when present and falls back to the
// auto-injected key otherwise, so it keeps working once Supabase fixes
// the underlying bug and this secret is no longer needed.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY_LEGACY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACADEMY_URL = Deno.env.get('ACADEMY_URL') || 'https://josueleto77.github.io/nexis-academy/';

// Always resolves with HTTP 200 (even for "expected" failures like bad auth
// or a duplicate email) and puts the real outcome in the JSON body's `ok`
// field instead. Supabase's client SDK treats any non-2xx response as a
// generic FunctionsHttpError with a hardcoded message ("Edge Function
// returned a non-2xx status code") and doesn't reliably expose the body
// behind it, so a non-2xx status is how our actual error text was getting
// swallowed client-side. A genuinely unexpected crash still falls through
// to Deno's own 500 with no JSON body, which is the one case the client
// truly can't get a specific message for.
function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
function fail(error: string) {
  return json({ ok: false, error: error });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('Method not allowed');

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer /, '');
  if (!jwt) return fail('Missing Authorization header');

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userRes, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userRes.user) return fail('Invalid session');
  const callerId = userRes.user.id;

  const { data: callerProfile } = await db.from('profiles').select('role').eq('id', callerId).maybeSingle();
  if (!callerProfile || callerProfile.role !== 'admin') {
    return fail('Only admins can invite representatives');
  }

  let payload: { email?: string; role?: string; teamId?: string | null };
  try {
    payload = await req.json();
  } catch {
    return fail('Invalid JSON body');
  }
  const email = (payload.email || '').toLowerCase().trim();
  const role = payload.role || 'rep';
  const teamId = payload.teamId || null;
  if (!email) return fail('email is required');
  if (!['rep', 'manager', 'admin'].includes(role)) return fail('invalid role');

  const { error: inviteErr } = await db
    .from('invites')
    .insert({ email, role, team_id: teamId, invited_by: callerId });
  if (inviteErr) {
    const isDuplicate = inviteErr.code === '23505' || /duplicate/i.test(inviteErr.message);
    return fail(isDuplicate ? 'That email has already been invited.' : inviteErr.message);
  }

  const { error: authErr } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: ACADEMY_URL });
  if (authErr) {
    // The invites row is saved either way -- report the invite as
    // partially successful so the admin knows to follow up manually
    // (e.g. this email already has an account).
    return json({ ok: true, emailSent: false, warning: authErr.message });
  }

  return json({ ok: true, emailSent: true });
});
