"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import StickyCard from "@/components/ui/StickyCard";
import PhaseTimer from "./PhaseTimer";
import { fetchMyWord } from "@/lib/rooms";
import { PHASE_SECONDS } from "@/lib/game/constants";

export default function WordCard({
  code,
  round,
  endsAt,
}: {
  code: string;
  round: number;
  endsAt: string | null;
}) {
  const [state, setState] = useState<
    | { loading: true }
    | { loading: false; role: "crew" | "imposter"; word: string }
  >({ loading: true });

  useEffect(() => {
    let cancel = false;
    setState({ loading: true });
    // small retry loop in case assignment write lands a beat after phase flip
    (async () => {
      for (let i = 0; i < 6; i++) {
        const res = await fetchMyWord(code);
        if (cancel) return;
        if (res) {
          setState({ loading: false, role: res.role, word: res.word });
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [code, round]);

  const imposter = !state.loading && state.role === "imposter";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
      <div className="font-display text-xl text-ink-soft">Round {round}</div>

      {state.loading ? (
        <p className="font-display animate-pulse text-2xl text-ink-soft">
          Dealing words… 🃏
        </p>
      ) : (
        <motion.div
          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
        >
          <StickyCard
            color={imposter ? "pink" : "green"}
            tilt={-1.5}
            tape
            seed={round * 7 + 3}
            className="w-[min(90vw,26rem)] text-center"
          >
            {imposter ? (
              <>
                <div className="text-6xl">🤫</div>
                <h2 className="font-display mt-1 text-3xl text-crayon-red">
                  You&apos;re the Imposter!
                </h2>
                <p className="font-hand mt-2 text-lg text-ink-soft">
                  You don&apos;t know the crew&apos;s word. Your decoy word is:
                </p>
                <div className="font-display mt-1 text-4xl">{state.word}</div>
                <p className="font-hand mt-3 text-lg text-ink-soft">
                  Draw to blend in. Don&apos;t get caught. 🎭
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl">🎨</div>
                <p className="font-hand mt-2 text-lg text-ink-soft">
                  The secret word is:
                </p>
                <div className="font-display mt-1 text-5xl text-crayon-blue">
                  {state.word}
                </div>
                <p className="font-hand mt-3 text-lg text-ink-soft">
                  Draw it together — one imposter is faking it. 👀
                </p>
                <p className="font-hand mt-2 rounded-lg bg-black/5 px-2 py-1 text-base text-ink-soft">
                  💡 Hint at it — don&apos;t draw it too obviously, or the imposter
                  will figure out the word!
                </p>
              </>
            )}
          </StickyCard>
        </motion.div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <PhaseTimer endsAt={endsAt} total={PHASE_SECONDS.word} />
        <span className="font-hand text-lg text-ink-soft">
          drawing starts…
        </span>
      </div>
    </div>
  );
}
