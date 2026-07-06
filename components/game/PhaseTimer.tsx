"use client";

import { useEffect, useState } from "react";

/** Circular countdown driven by an absolute deadline (phase_ends_at). */
export default function PhaseTimer({
  endsAt,
  total,
  size = 56,
}: {
  endsAt: string | null;
  total: number;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const remainingMs = Math.max(0, end - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const frac = total > 0 ? Math.max(0, Math.min(1, remainingMs / (total * 1000))) : 0;

  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const low = remaining <= 3;

  return (
    <svg width={size} height={size} className="shrink-0" aria-label={`${remaining}s left`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(43,42,40,.15)" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={low ? "var(--color-crayon-red)" : "var(--color-crayon-green)"}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .25s linear" }}
      />
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="font-display"
        fontSize={size * 0.34}
        fill="var(--color-ink)"
      >
        {remaining}
      </text>
    </svg>
  );
}
