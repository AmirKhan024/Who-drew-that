import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";
import { ensureHost } from "@/lib/game/host";

// Leave a room: remove the player, promote a new host if they were one, and
// delete the room entirely once it's empty (cascades rounds/votes/strokes/etc).
// Also handles `navigator.sendBeacon` bodies on hard close.
export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: player } = await admin
      .from("players")
      .select("is_host")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    await admin.from("players").delete().eq("id", playerId);
    await admin.from("player_secrets").delete().eq("player_id", playerId);

    const { count } = await admin
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("room_code", roomCode);

    if ((count ?? 0) === 0) {
      await admin.from("player_secrets").delete().eq("room_code", roomCode);
      await admin.from("rooms").delete().eq("code", roomCode);
      return NextResponse.json({ ok: true, roomDeleted: true });
    }

    if (player?.is_host) await ensureHost(admin, roomCode);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
