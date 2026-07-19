import { createClient } from "@supabase/supabase-js";

// These are public (anon) values — safe to expose to the browser.
// Row Level Security in Supabase governs what they can touch.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
