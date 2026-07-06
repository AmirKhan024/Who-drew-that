import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";
import { beginRound } from "@/lib/game/rounds";
import { normalizeSettings } from "@/lib/game/settings";
import { tallyVotes, computeScores } from "@/lib/game/engine";
import { PHASE_SECONDS } from "@/lib/game/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

function secondsFromNow(s: number): string {
  return new Date(Date.now() + s * 1000).toISOString();
}

/**
 * Guarded phase flip: only succeeds if the room is still in `fromPhase` at
 * `round`. Returns true if THIS caller won the transition (so score side-effects
 * run exactly once even if several clients nudge advance at the deadline).
 */
async function claim(
  admin: SupabaseClient,
  roomCode: string,
  fromPhase: string,
  round: number,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data } = await admin
    .from("rooms")
    .update(patch)
    .eq("code", roomCode)
    .eq("phase", fromPhase)
    .eq("current_round", round)
    .select("code");
  return Boolean(data && data.length > 0);
}

export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode, force } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: room } = await admin
      .from("rooms")
      .select(
        "phase, current_round, total_rounds, turn_order, turn_index, phase_ends_at, settings",
      )
      .eq("code", roomCode)
      .maybeSingle();
    if (!room) return NextResponse.json({ error: "no room" }, { status: 404 });

    const phase = room.phase as string;
    const round = room.current_round as number;
    const settings = normalizeSettings(room.settings ?? {});

    // Time gate: don't advance before the deadline (small grace for clock skew).
    // Exception: `force` may fast-forward ONLY a drawing turn (to skip an offline
    // drawer) — it can't end voting/reveal early, so impact is minimal.
    const endsAt = room.phase_ends_at
      ? new Date(room.phase_ends_at).getTime()
      : 0;
    const timeUp = Date.now() >= endsAt - 400;
    if (!timeUp && !(force && phase === "drawing"))
      return NextResponse.json({ ok: true, noop: "too-early" });

    switch (phase) {
      case "word": {
        await claim(admin, roomCode, "word", round, {
          phase: "drawing",
          turn_index: 0,
          phase_ends_at: secondsFromNow(settings.turnDurationSec),
        });
        break;
      }
      case "drawing": {
        const order = (room.turn_order as string[]) ?? [];
        const next = (room.turn_index as number) + 1;
        if (next < order.length) {
          await claim(admin, roomCode, "drawing", round, {
            turn_index: next,
            phase_ends_at: secondsFromNow(settings.turnDurationSec),
          });
        } else {
          await claim(admin, roomCode, "drawing", round, {
            phase: "discussion",
            phase_ends_at: secondsFromNow(settings.discussionSec),
          });
        }
        break;
      }
      case "discussion": {
        await claim(admin, roomCode, "discussion", round, {
          phase: "voting",
          phase_ends_at: secondsFromNow(settings.votingSec),
        });
        break;
      }
      case "voting": {
        // Compute reveal BEFORE claiming, then apply scores only if we win.
        const { data: roundRow } = await admin
          .from("rounds")
          .select("id, crew_word, imposter_word, imposter_ids")
          .eq("room_code", roomCode)
          .eq("round_number", round)
          .maybeSingle();
        const { data: players } = await admin
          .from("players")
          .select("id, score")
          .eq("room_code", roomCode);
        const { data: votes } = await admin
          .from("votes")
          .select("voter_id, target_id")
          .eq("round_id", roundRow!.id);

        const playerIds = (players ?? []).map((p: { id: string }) => p.id);
        const imposterIds = (roundRow!.imposter_ids as string[]) ?? [];
        const voteRows = (votes ?? []) as { voter_id: string; target_id: string }[];
        const tally = tallyVotes(voteRows);
        const { crewCaught, deltas } = computeScores(
          playerIds,
          imposterIds,
          voteRows,
          tally.accusedId,
        );

        const reveal = {
          roundNumber: round,
          crewWord: roundRow!.crew_word,
          imposterWord: roundRow!.imposter_word,
          imposterIds,
          accusedId: tally.accusedId,
          counts: tally.counts,
          deltas,
          crewCaught,
        };

        const won = await claim(admin, roomCode, "voting", round, {
          phase: "reveal",
          reveal,
          phase_ends_at: secondsFromNow(PHASE_SECONDS.reveal),
        });
        if (won) {
          await admin
            .from("rounds")
            .update({
              accused_id: tally.accusedId,
              outcome: crewCaught ? "crew" : "imposter",
            })
            .eq("id", roundRow!.id);
          // apply score deltas once
          await Promise.all(
            (players ?? []).map((p: { id: string; score: number }) =>
              admin
                .from("players")
                .update({ score: p.score + (deltas[p.id] ?? 0) })
                .eq("id", p.id),
            ),
          );
        }
        break;
      }
      case "reveal": {
        await claim(admin, roomCode, "reveal", round, {
          phase: "scoreboard",
          phase_ends_at: secondsFromNow(PHASE_SECONDS.scoreboard),
        });
        break;
      }
      case "scoreboard": {
        if (round < (room.total_rounds as number)) {
          // Claim the transition first so only one caller begins the next round.
          const won = await claim(admin, roomCode, "scoreboard", round, {
            phase: "starting",
            phase_ends_at: null,
          });
          if (won) {
            const { data: players } = await admin
              .from("players")
              .select("id")
              .eq("room_code", roomCode)
              .order("joined_at", { ascending: true });
            const ids = (players ?? []).map((p: { id: string }) => p.id);
            await beginRound(admin, roomCode, round + 1, ids, settings);
          }
        } else {
          await claim(admin, roomCode, "scoreboard", round, {
            phase: "ended",
            phase_ends_at: null,
          });
        }
        break;
      }
      default:
        return NextResponse.json({ ok: true, noop: phase });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
