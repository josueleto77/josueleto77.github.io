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
//
// The actual invite send below calls Supabase's Auth REST endpoint
// (POST /auth/v1/invite) directly with plain fetch, instead of the SDK's
// auth.admin.inviteUserByEmail(). That SDK method silently "succeeded"
// (no error) without ever creating a user or sending mail on this
// project, across multiple supabase-js versions -- calling the
// documented REST endpoint directly sidesteps whatever the SDK is doing
// wrong here, and is stable regardless of SDK version.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY_LEGACY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACADEMY_URL = Deno.env.get('ACADEMY_URL') || 'https://josueleto77.github.io/nexis-academy/';

async function sendInviteEmail(email: string): Promise<{ error: string | null }> {
  const url = SUPABASE_URL + '/auth/v1/invite?redirect_to=' + encodeURIComponent(ACADEMY_URL);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email })
    });
  } catch (e) {
    return { error: 'Could not reach Supabase Auth: ' + (e instanceof Error ? e.message : String(e)) };
  }
  if (res.ok) return { error: null };
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  const message =
    (body as any).msg || (body as any).message || (body as any).error_description || (body as any).error || res.statusText;
  return { error: 'HTTP ' + res.status + ': ' + message };
}

// Deno.serve does NOT answer CORS preflight (OPTIONS) requests on its own,
// and a response with no Access-Control-Allow-* headers makes the browser
// block the real request that follows -- the browser's own devtools showed
// this exactly: every invocation was "OPTIONS 200" and no POST ever
// actually went out. These headers go on every response, including OPTIONS.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

  let payload: { email?: string; role?: string; teamId?: string | null; classification?: string };
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

  // Classification (W-2 vs 1099) is decided up front, at invite time, never
  // mid-onboarding -- so a rep can complete their whole self-service
  // onboarding in one sitting instead of stalling on a "waiting on HR" step.
  const classification = payload.classification || 'not_assigned';
  if (role === 'rep' && !['w2_employee', '1099_contractor'].includes(classification)) {
    return fail('Employment classification (W-2 or 1099) is required when inviting a Sales Representative');
  }
  if (!['not_assigned', 'w2_employee', '1099_contractor'].includes(classification)) {
    return fail('invalid classification');
  }

  const { error: inviteErr } = await db
    .from('invites')
    .insert({ email, role, team_id: teamId, invited_by: callerId, classification: role === 'rep' ? classification : 'not_assigned' });
  if (inviteErr) {
    const isDuplicate = inviteErr.code === '23505' || /duplicate/i.test(inviteErr.message);
    return fail(isDuplicate ? 'That email has already been invited.' : inviteErr.message);
  }

  const { error: sendError } = await sendInviteEmail(email);
  if (sendError) {
    // The invites row is saved either way -- report the invite as
    // partially successful so the admin knows to follow up manually
    // (e.g. this email already has an account).
    return json({ ok: true, emailSent: false, warning: sendError });
  }

  return json({ ok: true, emailSent: true });
});
