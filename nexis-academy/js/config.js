/* ============================================================
   Nexis Power Academy — Supabase connection config
   The anon/public key is DESIGNED to be embedded in client code —
   it is meaningless without the Row Level Security policies in
   supabase/schema.sql, which is where the real security lives.
   NEVER put the service_role/secret key here or anywhere client-side.
   ============================================================ */
window.NEXIS_SUPABASE_CONFIG = {
  url: 'https://hborspmhbvapuuiksiry.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib3JzcG1oYnZhcHV1aWtzaXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NTIwNTUsImV4cCI6MjEwNTMyODA1NX0.ITc9aT1Q5VYw0kSdQ59RTcSjXIko1CDNaOe4Tq9JIrw'
};
