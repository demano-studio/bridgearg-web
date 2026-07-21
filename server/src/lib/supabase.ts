import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasEnv = typeof url === "string" && url.length > 0 && typeof serviceRoleKey === "string" && serviceRoleKey.length > 0;

/** Supabase admin client (service role) for server-side updates. Only available when env is set. */
export const supabase: SupabaseClient | null = hasEnv ? createClient(url!, serviceRoleKey!) : null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase server env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return supabase;
}
