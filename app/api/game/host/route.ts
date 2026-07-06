import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/game/auth";
import { ensureHost } from "@/lib/game/host";

// Client calls this when it detects the current host is offline. The server
// deterministically re-picks the host among online members.
export async function POST(req: Request) {
  try {
    const { playerId, secret, roomCode, onlineIds } = await req.json();
    const admin = getAdmin();
    if (!(await verifySecret(admin, playerId, secret)))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const hostId = await ensureHost(
      admin,
      roomCode,
      Array.isArray(onlineIds) ? onlineIds : undefined,
    );
    return NextResponse.json({ ok: true, hostId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
