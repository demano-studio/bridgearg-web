import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const hasEnv = typeof url === "string" && url.length > 0 && typeof anonKey === "string" && anonKey.length > 0;

/** True when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are available in frontend env vars. */
export const isSupabaseConfigured = hasEnv;

/** Supabase client, or null if env vars are missing (app can still render without Supabase). */
export const supabase: SupabaseClient | null = hasEnv ? createClient(url!, anonKey!) : null;

/** Throws if Supabase is not configured. Use when a feature requires Supabase. */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your frontend environment.");
  }
  return supabase;
}
