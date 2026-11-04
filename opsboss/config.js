/* OpsBoss — conexión a Supabase (proyecto de Nexis Academy).
   La clave publicable está DISEÑADA para ir en el cliente: sin las políticas
   RLS de supabase/schema.sql no da acceso a nada. NUNCA pongas aquí la
   service_role / secret key. Borra este archivo (o deja url vacío) para
   usar OpsBoss solo en modo local. */
window.OPSBOSS_CONFIG = {
  url: 'https://zalnezuwjbimvztgpkju.supabase.co',
  key: 'sb_publishable_PRfEGSkPnQxRREsGJ5x5uA_r7lof4AZ',
};
