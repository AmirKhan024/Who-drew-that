import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client for API routes ONLY. Bypasses RLS — never import from
// client components. Guarded by `server-only` so a client import fails the build.
const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (!URL || !SERVICE_KEY) {
    throw new Error(
      "Server Supabase env missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  if (!admin) {
    admin = createClient(URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
