import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";
import { beginRound } from "@/lib/game/rounds";
import { normalizeSettings } from "@/lib/game/settings";
import { canStartGame } from "@/lib/game/settings";

export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: room } = await admin
      .from("rooms")
      .select("settings, status")
      .eq("code", roomCode)
      .maybeSingle();
    if (!room) return NextResponse.json({ error: "no room" }, { status: 404 });

    // must be the host, and still in lobby
    const { data: me } = await admin
      .from("players")
      .select("is_host")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();
    if (!me?.is_host)
      return NextResponse.json({ error: "host only" }, { status: 403 });
    if (room.status !== "lobby")
      return NextResponse.json({ ok: true, already: true });

    const { data: players } = await admin
      .from("players")
      .select("id")
      .eq("room_code", roomCode)
      .order("joined_at", { ascending: true });
    const playerIds = (players ?? []).map((p: { id: string }) => p.id);

    const settings = normalizeSettings(room.settings ?? {});
    const check = canStartGame(playerIds.length, settings);
    if (!check.ok)
      return NextResponse.json({ error: check.reason }, { status: 409 });

    await admin
      .from("rooms")
      .update({ status: "in_game", total_rounds: settings.rounds })
      .eq("code", roomCode);
    await beginRound(admin, roomCode, 1, playerIds, settings);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
