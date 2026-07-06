import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensure the room has a sensible host. If the current host is still an online
 * member, nothing changes. Otherwise promote the earliest-joined online member
 * (falling back to earliest member). Deterministic pick => can't be hijacked by
 * a late joiner. Returns the resulting host id, or null if the room is empty.
 */
export async function ensureHost(
  admin: SupabaseClient,
  roomCode: string,
  onlineIds?: string[],
): Promise<string | null> {
  const { data: room } = await admin
    .from("rooms")
    .select("host_id")
    .eq("code", roomCode)
    .maybeSingle();
  if (!room) return null;

  const { data: players } = await admin
    .from("players")
    .select("id, is_host, joined_at")
    .eq("room_code", roomCode)
    .order("joined_at", { ascending: true });
  const members = players ?? [];
  if (members.length === 0) return null;

  const online = onlineIds?.length
    ? members.filter((p: { id: string }) => onlineIds.includes(p.id))
    : members;

  // Host still present and online → leave as-is.
  if (online.some((p: { id: string }) => p.id === room.host_id))
    return room.host_id as string;

  const newHost = (online[0] ?? members[0]).id as string;
  if (newHost === room.host_id) return newHost;

  // Flip flags: clear all, set the new host.
  await admin
    .from("players")
    .update({ is_host: false })
    .eq("room_code", roomCode)
    .eq("is_host", true);
  await admin.from("players").update({ is_host: true }).eq("id", newHost);
  await admin
    .from("rooms")
    .update({ host_id: newHost })
    .eq("code", roomCode)
    .eq("host_id", room.host_id);
  return newHost;
}
