"use client";

import { useEffect, useRef } from "react";
import type { RoomRow } from "./supabase/types";
import { advancePhase } from "./rooms";

/**
 * Drives phase transitions. The host nudges `/api/game/advance` the moment
 * `phase_ends_at` passes; other players act as a fallback after a short grace so
 * a host disconnect can't hard-stall the game. Additionally, if the current
 * drawer is offline, advance their turn immediately instead of burning the timer.
 * The server transition is guarded + idempotent, so extra nudges are harmless.
 */
export function usePhaseClock(
  room: RoomRow | null,
  isHost: boolean,
  code: string,
  onlineIds: Set<string>,
) {
  const firedFor = useRef<string>("");

  // Time-based advance (deadline reached).
  useEffect(() => {
    if (!room?.phase_ends_at) return;
    const endsAt = new Date(room.phase_ends_at).getTime();
    const grace = isHost ? 0 : 2500;
    const key = room.phase_ends_at;

    const tick = () => {
      if (firedFor.current === key) return;
      if (Date.now() >= endsAt + grace) {
        firedFor.current = key;
        advancePhase(code);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [room?.phase_ends_at, room?.phase, isHost, code]);

  // Skip an offline drawer's turn (don't wait the full timer).
  const skipKey = `${room?.phase}:${room?.current_round}:${room?.turn_index}`;
  const skippedFor = useRef<string>("");
  useEffect(() => {
    if (!room || room.phase !== "drawing") return;
    const active = room.turn_order?.[room.turn_index];
    if (!active) return;
    // give a short window for presence to settle after a transition
    const t = setTimeout(() => {
      if (skippedFor.current === skipKey) return;
      if (!onlineIds.has(active)) {
        skippedFor.current = skipKey;
        advancePhase(code, true); // force-skip this drawing turn
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [skipKey, room, onlineIds, code]);
}
