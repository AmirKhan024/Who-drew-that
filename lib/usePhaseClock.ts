"use client";

import { useEffect, useRef } from "react";
import type { RoomRow } from "./supabase/types";
import { advancePhase } from "./rooms";
import { serverNow, syncServerTime } from "./serverTime";

/**
 * Drives phase transitions. The host nudges `/api/game/advance` the moment
 * `phase_ends_at` passes (in SERVER time, to survive local clock skew); other
 * players act as a fallback after a short grace so a host disconnect can't stall
 * the game. If the server says "too early" (clock skew), we retry rather than
 * giving up. If the current drawer is offline, we force-skip their turn. The
 * server transition is guarded + idempotent, so extra nudges are harmless.
 */
export function usePhaseClock(
  room: RoomRow | null,
  isHost: boolean,
  code: string,
  onlineIds: Set<string>,
) {
  const firedFor = useRef<string>("");
  const busy = useRef(false);

  useEffect(() => {
    syncServerTime();
  }, []);

  // Time-based advance (deadline reached, measured against server time).
  useEffect(() => {
    if (!room?.phase_ends_at) return;
    const endsAt = new Date(room.phase_ends_at).getTime();
    const grace = isHost ? 0 : 2500;
    const key = room.phase_ends_at;

    const tick = async () => {
      if (firedFor.current === key || busy.current) return;
      if (serverNow() < endsAt + grace) return;
      busy.current = true;
      try {
        const { advanced } = await advancePhase(code);
        // Only stop nudging once the server actually moved on. If it was too
        // early (skew) or lost, the next tick retries.
        if (advanced) firedFor.current = key;
      } finally {
        busy.current = false;
      }
    };
    tick();
    const id = setInterval(tick, 600);
    return () => clearInterval(id);
  }, [room?.phase_ends_at, room?.phase, isHost, code]);

  // Skip an offline drawer's turn (don't wait the full timer).
  const skipKey = `${room?.phase}:${room?.current_round}:${room?.turn_index}`;
  const skippedFor = useRef<string>("");
  useEffect(() => {
    if (!room || room.phase !== "drawing") return;
    const active = room.turn_order?.[room.turn_index];
    if (!active) return;
    const t = setTimeout(() => {
      if (skippedFor.current === skipKey) return;
      if (!onlineIds.has(active)) {
        skippedFor.current = skipKey;
        advancePhase(code, true); // force-skip this drawing turn
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [skipKey, room, onlineIds, code]);
}
