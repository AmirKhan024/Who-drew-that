import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Verify a caller owns the given playerId via their capability secret. */
export async function verifySecret(
  admin: SupabaseClient,
  playerId: string,
  secret: string,
): Promise<boolean> {
  if (!playerId || !secret) return false;
  const { data } = await admin
    .from("player_secrets")
    .select("secret")
    .eq("player_id", playerId)
    .maybeSingle();
  return Boolean(data && data.secret === secret);
}
