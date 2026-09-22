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
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACADEMY_URL = Deno.env.get('ACADEMY_URL') || 'https://josueleto77.github.io/nexis-academy/';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer /, '');
  if (!jwt) return json({ error: 'Missing Authorization header' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userRes, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userRes.user) return json({ error: 'Invalid session' }, 401);
  const callerId = userRes.user.id;

  const { data: callerProfile } = await db.from('profiles').select('role').eq('id', callerId).maybeSingle();
  if (!callerProfile || callerProfile.role !== 'admin') {
    return json({ error: 'Only admins can invite representatives' }, 403);
  }

  let payload: { email?: string; role?: string; teamId?: string | null };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const email = (payload.email || '').toLowerCase().trim();
  const role = payload.role || 'rep';
  const teamId = payload.teamId || null;
  if (!email) return json({ error: 'email is required' }, 400);
  if (!['rep', 'manager', 'admin'].includes(role)) return json({ error: 'invalid role' }, 400);

  const { error: inviteErr } = await db
    .from('invites')
    .insert({ email, role, team_id: teamId, invited_by: callerId });
  if (inviteErr) {
    const isDuplicate = inviteErr.code === '23505' || /duplicate/i.test(inviteErr.message);
    return json({ error: isDuplicate ? 'That email has already been invited.' : inviteErr.message }, isDuplicate ? 409 : 500);
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
