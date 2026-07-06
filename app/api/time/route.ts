import { NextResponse } from "next/server";

// Authoritative server time so clients can correct for local clock skew when
// deciding whether a phase deadline (phase_ends_at) has passed.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ now: Date.now() });
}
