import { createClient } from "@supabase/supabase-js";

// This is the anon/public key: it's designed to be embedded in client
// bundles and is safe to commit — real access control lives in the Row
// Level Security policies defined in supabase/schema.sql, not in keeping
// this key secret. Never put the service_role key here or in any file
// that ships to the browser.
const SUPABASE_URL = "https://vgqigexbgojcnbgruqio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncWlnZXhiZ29qY25iZ3J1cWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Nzg1MzksImV4cCI6MjEwNDU1NDUzOX0.u_2lzrV-qNgUb2oDX-eEVnHtnYPKvSc-i5Iib0wCKD8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const LISTING_PHOTOS_BUCKET = "listing-photos";
export const AVATARS_BUCKET = "avatars";
