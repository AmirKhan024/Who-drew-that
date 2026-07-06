"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import StickyCard from "@/components/ui/StickyCard";
import DoodleAvatar from "@/components/ui/DoodleAvatar";
import DoodleButton from "@/components/ui/DoodleButton";
import type { PlayerRow } from "@/lib/supabase/types";
import { celebrate } from "@/lib/confetti";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Scoreboard({
  players,
  round,
  totalRounds,
  final = false,
}: {
  players: PlayerRow[];
  round: number;
  totalRounds: number;
  final?: boolean;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const winners = ranked.filter((p) => p.score === topScore && topScore > 0);

  useEffect(() => {
    if (final) {
      celebrate();
      const t = setTimeout(celebrate, 700);
      return () => clearTimeout(t);
    }
  }, [final]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 py-8">
      <motion.h2
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-display text-center text-3xl sm:text-4xl"
      >
        {final ? "🏆 Final Scores!" : `Round ${round} of ${totalRounds} done`}
      </motion.h2>

      {final && winners.length > 0 && (
        <p className="font-scribble text-2xl text-crayon-purple">
          {winners.map((w) => w.name).join(" & ")} win{winners.length > 1 ? "" : "s"}! 🎉
        </p>
      )}

      <StickyCard color="paper" tilt={-0.6} seed={64} className="w-[min(92vw,26rem)]">
        <ul className="flex flex-col gap-2">
          {ranked.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              <span className="font-display w-7 text-center text-xl">
                {MEDALS[i] ?? i + 1}
              </span>
              <DoodleAvatar seed={p.avatar_seed || p.name} size={40} />
              <span className="font-hand flex-1 truncate text-xl">{p.name}</span>
              <span className="font-display text-xl tabular-nums text-crayon-green">
                {p.score}
              </span>
            </motion.li>
          ))}
        </ul>
      </StickyCard>

      {final ? (
        <Link href="/">
          <DoodleButton variant="green" size="lg" seed={70}>
            🏠 Back to start
          </DoodleButton>
        </Link>
      ) : (
        <p className="font-hand animate-pulse text-lg text-ink-soft">
          Next round starting…
        </p>
      )}
    </div>
  );
}
