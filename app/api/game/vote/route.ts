import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";

// Cast a secret vote for the current round. Votes stay in a deny-anon table so
// nobody can peek at the tally before the reveal.
export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode, targetId } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: room } = await admin
      .from("rooms")
      .select("current_round, phase")
      .eq("code", roomCode)
      .maybeSingle();
    if (!room || room.phase !== "voting")
      return NextResponse.json({ error: "not voting" }, { status: 409 });

    const { data: round } = await admin
      .from("rounds")
      .select("id")
      .eq("room_code", roomCode)
      .eq("round_number", room.current_round)
      .maybeSingle();
    if (!round) return NextResponse.json({ error: "no round" }, { status: 404 });

    await admin
      .from("votes")
      .upsert(
        { round_id: round.id, voter_id: playerId, target_id: targetId },
        { onConflict: "round_id,voter_id" },
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
