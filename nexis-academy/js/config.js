/* ============================================================
   Nexis Power Academy — Supabase connection config
   The anon/public key is DESIGNED to be embedded in client code —
   it is meaningless without the Row Level Security policies in
   supabase/schema.sql, which is where the real security lives.
   NEVER put the service_role/secret key here or anywhere client-side.
   ============================================================ */
window.NEXIS_SUPABASE_CONFIG = {
  url: 'https://zalnezuwjbimvztgpkju.supabase.co',
  anonKey: 'sb_publishable_PRfEGSkPnQxRREsGJ5x5uA_r7lof4AZ'
};
