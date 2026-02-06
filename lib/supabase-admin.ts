import { createClient } from "@supabase/supabase-js";

let cached:
  | ReturnType<typeof createClient>
  | null
  | undefined = undefined;

export function getSupabaseAdmin() {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    cached = null;
    return cached;
  }
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
  return cached;
}
