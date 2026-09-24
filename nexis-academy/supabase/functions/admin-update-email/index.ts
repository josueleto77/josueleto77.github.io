// ============================================================
// admin-update-email — Supabase Edge Function
//
// Admin-only: changes a rep's login email (what reps think of as their
// "username" — the system has no separate username, sign-in is by email)
// and keeps profiles.email in sync. Requires the service role key, so it
// can't run in the browser.
//
// Deploy:
//   supabase functions deploy admin-update-email
//
// Uses the raw Auth REST admin endpoint with the LEGACY service role JWT,
// not the SDK's auth.admin.* helper — same workaround as invite-rep, for
// the same reason (see that function's header comment): on this project's
// sb_secret_... key format, the SDK's admin.* helpers silently fail, while
// a direct fetch with the legacy JWT works.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY_LEGACY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer /, '');
  if (!jwt) return fail('Missing Authorization header');

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userRes, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userRes.user) return fail('Invalid session');
  const callerId = userRes.user.id;

  const { data: callerProfile } = await db.from('profiles').select('role').eq('id', callerId).maybeSingle();
  if (!callerProfile || callerProfile.role !== 'admin') {
    return fail('Only admins can change a user’s login email');
  }

  let payload: { userId?: string; newEmail?: string };
  try {
    payload = await req.json();
  } catch {
    return fail('Invalid JSON body');
  }
  const targetUserId = payload.userId;
  const newEmail = (payload.newEmail || '').toLowerCase().trim();
  if (!targetUserId) return fail('userId is required');
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return fail('A valid newEmail is required');

  let authRes: Response;
  try {
    authRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + targetUserId, {
      method: 'PUT',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: newEmail, email_confirm: true })
    });
  } catch (e) {
    return fail('Could not reach Supabase Auth: ' + (e instanceof Error ? e.message : String(e)));
  }
  if (!authRes.ok) {
    const body = await authRes.json().catch(() => ({} as Record<string, unknown>));
    const message =
      (body as any).msg || (body as any).message || (body as any).error_description || (body as any).error || authRes.statusText;
    return fail('HTTP ' + authRes.status + ': ' + message);
  }

  const { error: profileErr } = await db.from('profiles').update({ email: newEmail }).eq('id', targetUserId);
  if (profileErr) {
    return fail('Login email was updated, but the profiles table failed to sync: ' + profileErr.message);
  }

  return json({ ok: true });
});
