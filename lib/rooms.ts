"use client";

import { ensureAuth, getSupabase } from "./supabase/client";
import type { GameSettings } from "./game/settings";
import { normalizeSettings } from "./game/settings";
import { PLAYER_LIMITS } from "./game/constants";
import { generateRoomCode } from "./roomCode";
import type { Identity } from "./identity";
import { getPlayerId, getPlayerSecret } from "./identity";

export type RoomResult =
  | { ok: true; code: string; uid: string }
  | { ok: false; error: string };

function requireClient() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  return sb;
}

/** Create a room, insert the host player, return the room code. */
export async function createRoom(
  identity: Identity,
  settings: GameSettings,
): Promise<RoomResult> {
  const sb = requireClient();
  const uid = await ensureAuth();
  if (!uid) return { ok: false, error: "Could not sign in. Try again." };

  const clean = normalizeSettings(settings);

  // Retry a few times on the (very unlikely) code collision.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode();
    const { error } = await sb
      .from("rooms")
      .insert({ code, host_id: uid, settings: clean, status: "lobby" });
    if (error) {
      if (error.code === "23505") continue; // duplicate code -> retry
      return { ok: false, error: error.message };
    }
    const joined = await upsertPlayer(code, uid, identity, true);
    if (!joined.ok) return joined;
    return { ok: true, code, uid };
  }
  return { ok: false, error: "Couldn't find a free room code. Try again." };
}

/** Join an existing lobby by code. */
export async function joinRoom(
  code: string,
  identity: Identity,
): Promise<RoomResult> {
  const sb = requireClient();
  const uid = await ensureAuth();
  if (!uid) return { ok: false, error: "Could not sign in. Try again." };

  const { data: room, error } = await sb
    .from("rooms")
    .select("code,status")
    .eq("code", code)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!room) return { ok: false, error: "No room with that code." };
  if (room.status !== "lobby")
    return { ok: false, error: "That game has already started." };

  const { count } = await sb
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", code);
  // Allow rejoin (same uid) even at cap.
  if ((count ?? 0) >= PLAYER_LIMITS.SOFT_MAX) {
    const { data: existing } = await sb
      .from("players")
      .select("id")
      .eq("room_code", code)
      .eq("id", uid)
      .maybeSingle();
    if (!existing) return { ok: false, error: "This room is full." };
  }

  const joined = await upsertPlayer(code, uid, identity, false);
  if (!joined.ok) return joined;
  return { ok: true, code, uid };
}

async function upsertPlayer(
  code: string,
  uid: string,
  identity: Identity,
  isHost: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = requireClient();
  const { error } = await sb.from("players").upsert(
    {
      id: uid,
      room_code: code,
      name: identity.name.trim().slice(0, 20) || "Player",
      avatar_seed: identity.avatarSeed,
      is_host: isHost,
      is_ready: isHost, // host counts as ready
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  // Register this player's capability secret so the server can hand back their
  // private word later. Best-effort; ignore failures here.
  await registerSecret(code);
  return { ok: true };
}

/** Store our capability secret server-side (deny-anon table via API route). */
export async function registerSecret(code: string): Promise<void> {
  try {
    await fetch("/api/game/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: getPlayerId(),
        roomCode: code,
        secret: getPlayerSecret(),
      }),
    });
  } catch {
    /* non-fatal */
  }
}

export async function setReady(uid: string, ready: boolean): Promise<void> {
  const sb = requireClient();
  await sb.from("players").update({ is_ready: ready }).eq("id", uid);
}

export async function updateSettings(
  code: string,
  settings: GameSettings,
): Promise<void> {
  const sb = requireClient();
  await sb
    .from("rooms")
    .update({ settings: normalizeSettings(settings) })
    .eq("code", code);
}

/** Leave a room: server removes us, migrates host, deletes empty rooms. */
export async function leaveRoom(code: string): Promise<void> {
  await gamePost("/api/game/leave", { roomCode: code });
}

// ---- game actions (server-authoritative via API routes) -------------------

async function gamePost<T = unknown>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: getPlayerId(),
        secret: getPlayerSecret(),
        ...body,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network" };
  }
}

/** Host starts the game: server assigns words + builds round 1. */
export async function startGame(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  await registerSecret(code); // ensure the host secret exists first
  return gamePost("/api/game/start", { roomCode: code });
}

/** Nudge the phase state machine forward (host clock / stall fallback).
 *  `force` fast-forwards only a drawing turn (used to skip an offline drawer).
 *  Returns whether the server actually advanced (false if it was too early). */
export async function advancePhase(
  code: string,
  force = false,
): Promise<{ advanced: boolean }> {
  const res = await gamePost<{ noop?: string }>("/api/game/advance", {
    roomCode: code,
    force,
  });
  const advanced = res.ok && !res.data?.noop;
  return { advanced };
}

/** Fetch ONLY my own word for the current round. */
export async function fetchMyWord(
  code: string,
): Promise<{ role: "crew" | "imposter"; word: string; round: number } | null> {
  const res = await gamePost<{ role: "crew" | "imposter"; word: string; round: number }>(
    "/api/game/word",
    { roomCode: code },
  );
  return res.ok && res.data ? res.data : null;
}

export async function submitVote(code: string, targetId: string): Promise<void> {
  await gamePost("/api/game/vote", { roomCode: code, targetId });
}

/** Ask the server to re-pick the host (called when host looks offline). */
export async function claimHost(
  code: string,
  onlineIds: string[],
): Promise<void> {
  await gamePost("/api/game/host", { roomCode: code, onlineIds });
}

/** Persist a completed stroke (server verifies it's our turn). */
export async function commitStroke(
  code: string,
  stroke: { id: string; color: string; points: { x: number; y: number }[] },
): Promise<boolean> {
  const res = await gamePost("/api/game/stroke", { roomCode: code, stroke });
  return res.ok;
}
