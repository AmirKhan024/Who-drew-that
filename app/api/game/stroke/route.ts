import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";

// Persist a completed stroke — but ONLY if it's genuinely this player's turn.
// Closes the out-of-turn injection hole (the strokes table denies anon insert).
export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode, stroke } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: room } = await admin
      .from("rooms")
      .select("phase, turn_order, turn_index, current_round")
      .eq("code", roomCode)
      .maybeSingle();
    if (!room) return NextResponse.json({ error: "no room" }, { status: 404 });

    const order = (room.turn_order as string[]) ?? [];
    const active = order[room.turn_index as number];
    if (room.phase !== "drawing" || active !== playerId)
      return NextResponse.json({ error: "not your turn" }, { status: 403 });

    const points = Array.isArray(stroke?.points)
      ? stroke.points.slice(0, 5000)
      : [];
    if (points.length === 0)
      return NextResponse.json({ error: "empty stroke" }, { status: 400 });

    await admin.from("strokes").insert({
      id: stroke.id,
      room_code: roomCode,
      round_number: room.current_round,
      player_id: playerId,
      seq: Date.now(),
      color: typeof stroke.color === "string" ? stroke.color : "#2b2a28",
      points,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
