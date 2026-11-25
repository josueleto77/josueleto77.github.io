// OpsBoss — aceptar una invitación con link: crea la cuenta (ya verificada, sin email de confirmación)
// y la agrega al equipo con el rol de la invitación. Pública: la autorización es el token de la invitación.
// Si el email ya tenía cuenta, no cambia su contraseña: solo la agrega al equipo.

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const H = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const { token, name, password } = await req.json().catch(() => ({}));
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return json({ error: 'invalid' }, 400);
    const r = await fetch(`${SB_URL}/rest/v1/opsboss_invites?token=eq.${token}&select=*`, { headers: H });
    const [inv] = r.ok ? await r.json() : [];
    if (!inv || (inv.expires_at && new Date(inv.expires_at) < new Date())) return json({ error: 'invalid' }, 404);
    const fullName = String(name || inv.name || '').trim().slice(0, 120) || inv.email.split('@')[0];

    const u = await fetch(`${SB_URL}/rest/v1/rpc/opsboss_user_id_by_email`, { method: 'POST', headers: H, body: JSON.stringify({ p_email: inv.email }) });
    let userId: string | null = u.ok ? await u.json() : null;
    const existing = !!userId;
    if (!userId) {
      if (typeof password !== 'string' || password.length < 8) return json({ error: 'password' }, 400);
      const c = await fetch(`${SB_URL}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email: inv.email, password, email_confirm: true, user_metadata: { name: fullName } }) });
      const cu = await c.json().catch(() => ({}));
      if (!c.ok || !cu.id) { console.error('create user', c.status, cu?.msg || cu?.message); return json({ error: 'create_failed', message: cu?.msg || cu?.message }, 400); }
      userId = cu.id;
    } else {
      // cuenta existente: marcar el email como verificado (no se toca la contraseña)
      await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, { method: 'PUT', headers: H, body: JSON.stringify({ email_confirm: true }) });
    }

    const m = await fetch(`${SB_URL}/rest/v1/opsboss_members`, { method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ user_id: userId, email: inv.email, name: fullName, role: inv.role }) });
    if (!m.ok) { console.error('member', m.status, await m.text()); return json({ error: 'member_failed' }, 500); }
    await fetch(`${SB_URL}/rest/v1/opsboss_invites?email=eq.${encodeURIComponent(inv.email)}`, { method: 'DELETE', headers: H });
    return json({ ok: true, email: inv.email, existing });
  } catch (e) {
    console.error('accept', (e as Error).message);
    return json({ error: 'server' }, 500);
  }
});
