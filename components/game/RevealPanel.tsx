"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import StickyCard from "@/components/ui/StickyCard";
import DoodleAvatar from "@/components/ui/DoodleAvatar";
import type { PlayerRow, RevealPayload } from "@/lib/supabase/types";
import { celebrate } from "@/lib/confetti";

export default function RevealPanel({
  reveal,
  players,
}: {
  reveal: RevealPayload;
  players: PlayerRow[];
}) {
  useEffect(() => {
    if (reveal.crewCaught) celebrate();
  }, [reveal.crewCaught]);

  const byId = new Map(players.map((p) => [p.id, p]));
  const imposters = reveal.imposterIds.map((id) => byId.get(id)).filter(Boolean) as PlayerRow[];
  const accused = reveal.accusedId ? byId.get(reveal.accusedId) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 py-8">
      <motion.h2
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 12 }}
        className="font-display text-center text-3xl sm:text-4xl"
      >
        {reveal.crewCaught ? (
          <span className="text-crayon-green">🎉 Crew caught them!</span>
        ) : (
          <span className="text-crayon-red">🕵️ The imposter escaped!</span>
        )}
      </motion.h2>

      <StickyCard color="paper" tilt={-1} seed={91} className="w-[min(92vw,30rem)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="font-hand text-lg text-ink-soft">
            The imposter{imposters.length > 1 ? "s were" : " was"}…
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {imposters.map((p) => (
              <motion.div
                key={p.id}
                initial={{ rotate: -12, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="flex flex-col items-center"
              >
                <DoodleAvatar seed={p.avatar_seed || p.name} size={64} />
                <span className="font-display mt-1 text-xl text-crayon-red">
                  {p.name} 🎭
                </span>
              </motion.div>
            ))}
          </div>

          <div className="mt-2 flex w-full justify-around gap-3">
            <div>
              <div className="font-hand text-sm text-ink-soft">Crew word</div>
              <div className="font-display text-2xl text-crayon-blue">
                {reveal.crewWord}
              </div>
            </div>
            <div>
              <div className="font-hand text-sm text-ink-soft">Imposter word</div>
              <div className="font-display text-2xl text-crayon-red">
                {reveal.imposterWord}
              </div>
            </div>
          </div>

          <div className="font-hand mt-1 text-lg text-ink-soft">
            {accused
              ? `Most voted: ${accused.name}`
              : "Votes were tied — nobody was caught."}
          </div>

          {/* score deltas */}
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {players
              .filter((p) => (reveal.deltas[p.id] ?? 0) > 0)
              .map((p) => (
                <span key={p.id} className="font-display text-lg text-crayon-green">
                  {p.name} +{reveal.deltas[p.id]}
                </span>
              ))}
          </div>
        </div>
      </StickyCard>
    </div>
  );
}
