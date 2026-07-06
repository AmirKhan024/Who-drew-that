import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHASE_SECONDS } from "./constants";
import { buildTurnOrder, pickImposters } from "./engine";
import { pickWordPair } from "./words";
import { generateWordPair } from "./groq";
import type { GameSettings } from "./settings";

function secondsFromNow(s: number): string {
  return new Date(Date.now() + s * 1000).toISOString();
}

/**
 * Create a round: pick a word pair + imposters, write the (secret) round +
 * per-player assignments, build a fresh turn order, and move the room into the
 * 'word' phase. Used for round 1 (start) and every subsequent round (advance).
 */
export async function beginRound(
  admin: SupabaseClient,
  roomCode: string,
  roundNumber: number,
  playerIds: string[],
  settings: GameSettings,
): Promise<void> {
  const { data: prev } = await admin
    .from("rounds")
    .select("crew_word")
    .eq("room_code", roomCode);
  const used = (prev ?? []).map((r: { crew_word: string }) => r.crew_word);

  const pair = (await generateWordPair(used)) ?? pickWordPair(used);
  const [crewWord, imposterWord] = pair;
  const imposterIds = pickImposters(playerIds, settings.imposterCount);

  const { data: round, error } = await admin
    .from("rounds")
    .insert({
      room_code: roomCode,
      round_number: roundNumber,
      crew_word: crewWord,
      imposter_word: imposterWord,
      imposter_ids: imposterIds,
    })
    .select("id")
    .single();
  if (error) throw error;

  const impSet = new Set(imposterIds);
  const rows = playerIds.map((id) => ({
    round_id: round.id,
    player_id: id,
    role: impSet.has(id) ? "imposter" : "crew",
    word: impSet.has(id) ? imposterWord : crewWord,
  }));
  await admin.from("assignments").insert(rows);

  const turnOrder = buildTurnOrder(playerIds, settings.drawingCycles);
  await admin
    .from("rooms")
    .update({
      phase: "word",
      current_round: roundNumber,
      turn_order: turnOrder,
      turn_index: 0,
      phase_ends_at: secondsFromNow(PHASE_SECONDS.word),
      reveal: null,
    })
    .eq("code", roomCode);
}
