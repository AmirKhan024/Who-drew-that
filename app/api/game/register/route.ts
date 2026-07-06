import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";

// Register a player's capability secret (first-write-wins) so the server can
// later verify the caller before handing back their private word.
export async function POST(req: Request) {
  try {
    const { playerId, roomCode, secret } = await req.json();
    if (!playerId || !roomCode || !secret)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const admin = getAdmin();
    const { data: existing } = await admin
      .from("player_secrets")
      .select("player_id")
      .eq("player_id", playerId)
      .maybeSingle();

    if (!existing) {
      await admin
        .from("player_secrets")
        .insert({ player_id: playerId, room_code: roomCode, secret });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
