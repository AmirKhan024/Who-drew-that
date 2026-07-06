import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";

// Return ONLY the caller's own role + word for the current round.
// The `assignments` table denies the anon key, so this route is the only way to
// read a word — and it only ever returns yours.
export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: room } = await admin
      .from("rooms")
      .select("current_round")
      .eq("code", roomCode)
      .maybeSingle();
    if (!room) return NextResponse.json({ error: "no room" }, { status: 404 });

    const { data: round } = await admin
      .from("rounds")
      .select("id")
      .eq("room_code", roomCode)
      .eq("round_number", room.current_round)
      .maybeSingle();
    if (!round)
      return NextResponse.json({ error: "no round yet" }, { status: 404 });

    const { data: assignment } = await admin
      .from("assignments")
      .select("role, word")
      .eq("round_id", round.id)
      .eq("player_id", playerId)
      .maybeSingle();
    if (!assignment)
      return NextResponse.json({ error: "no assignment" }, { status: 404 });

    return NextResponse.json({
      role: assignment.role,
      word: assignment.word,
      round: room.current_round,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
