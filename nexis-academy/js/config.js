/* ============================================================
   Nexis Power Academy — Supabase connection config
   The anon/public key is DESIGNED to be embedded in client code —
   it is meaningless without the Row Level Security policies in
   supabase/schema.sql, which is where the real security lives.
   NEVER put the service_role/secret key here or anywhere client-side.
   ============================================================ */
window.NEXIS_SUPABASE_CONFIG = {
  url: 'https://zalnezuwjbimvztgpkju.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbG5lenV3amJpbXZ6dGdwa2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMTA0NDgsImV4cCI6MjEwNTU4NjQ0OH0.nDBv1YRNAKCj0ghI4tusf4F9b6Kjslkya2EByClXBZI'
};
