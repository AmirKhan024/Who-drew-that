"use client";

// Corrects for local clock skew. We fetch the server's clock once and keep the
// offset so `serverNow()` ≈ the server's Date.now(). Phase deadlines
// (phase_ends_at) are server timestamps, so comparing against serverNow() avoids
// a skewed device firing phase transitions too early/late.

let offset = 0;
let synced = false;

export async function syncServerTime(): Promise<void> {
  if (synced) return;
  try {
    const t0 = Date.now();
    const res = await fetch("/api/time", { cache: "no-store" });
    const { now } = await res.json();
    const rtt = Date.now() - t0;
    // estimate server "now" at response receipt = now + rtt/2
    offset = now + rtt / 2 - Date.now();
    synced = true;
  } catch {
    offset = 0;
  }
}

export function serverNow(): number {
  return Date.now() + offset;
}
