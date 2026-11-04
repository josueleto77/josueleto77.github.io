/* OpsBoss — conexión a Supabase (proyecto "opsboss", organización Nexis).
   La clave publicable está DISEÑADA para ir en el cliente: sin las políticas
   RLS de supabase/schema.sql no da acceso a nada. NUNCA pongas aquí la
   service_role / secret key. Deja url vacío para usar OpsBoss solo en modo local. */
window.OPSBOSS_CONFIG = {
  url: 'https://nkmgpsbqmqwlsaxtbgaq.supabase.co',
  key: 'sb_publishable_1qBY44uoGlEHXdAEeNqnng_GIlAXFfZ',
};
