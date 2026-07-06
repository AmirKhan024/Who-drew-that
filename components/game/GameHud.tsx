"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DoodleAvatar from "@/components/ui/DoodleAvatar";
import type { PlayerRow, RoomRow } from "@/lib/supabase/types";
import { fetchMyWord } from "@/lib/rooms";

// Always-visible top bar: round, a peek at your own role/word, and a live
// scoreboard popover. Keeps context on screen through every phase.
export default function GameHud({
  code,
  room,
  players,
  onlineIds,
  onLeave,
}: {
  code: string;
  room: RoomRow;
  players: PlayerRow[];
  onlineIds: Set<string>;
  onLeave: () => void;
}) {
  const [mine, setMine] = useState<{ role: string; word: string } | null>(null);
  const [peek, setPeek] = useState(false);
  const [scores, setScores] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const r = await fetchMyWord(code);
      if (!cancel && r) setMine({ role: r.role, word: r.word });
    })();
    return () => {
      cancel = true;
    };
  }, [code, room.current_round]);

  const ranked = [...players].sort((a, b) => b.score - a.score);
  const onlineCount = players.filter((p) => onlineIds.has(p.id)).length;

  return (
    <div className="relative z-20 flex w-full max-w-3xl items-center justify-between gap-2 px-1">
      <div className="font-display rounded-full border-[2.5px] border-ink bg-white px-3 py-1 text-lg">
        Round {room.current_round}
        <span className="text-ink-soft">/{room.total_rounds}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* peek at your role */}
        <div className="relative">
          <button
            onClick={() => setPeek((v) => !v)}
            className="font-display cursor-pointer rounded-full border-[2.5px] border-ink bg-note-yellow px-3 py-1 text-lg"
          >
            👁 role
          </button>
          <AnimatePresence>
            {peek && mine && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-11 w-44 rounded-xl border-[2.5px] border-ink bg-white p-3 text-center shadow-[var(--shadow-sticker)]"
              >
                <div
                  className={`font-display text-xl ${
                    mine.role === "imposter" ? "text-crayon-red" : "text-crayon-blue"
                  }`}
                >
                  {mine.role === "imposter" ? "🎭 Imposter" : "🖍️ Crew"}
                </div>
                <div className="font-hand text-lg">
                  word: <b>{mine.word}</b>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* scoreboard popover */}
        <div className="relative">
          <button
            onClick={() => setScores((v) => !v)}
            className="font-display cursor-pointer rounded-full border-[2.5px] border-ink bg-white px-3 py-1 text-lg"
          >
            🏆 {onlineCount}👤
          </button>
          <AnimatePresence>
            {scores && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-11 z-30 w-52 rounded-xl border-[2.5px] border-ink bg-white p-2 shadow-[var(--shadow-sticker)]"
              >
                <ul className="flex flex-col gap-1">
                  {ranked.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          onlineIds.has(p.id) ? "bg-crayon-green" : "bg-ink-soft/40"
                        }`}
                      />
                      <DoodleAvatar seed={p.avatar_seed || p.name} size={22} />
                      <span className="font-hand flex-1 truncate text-base">
                        {p.name}
                      </span>
                      <span className="font-display tabular-nums text-base text-crayon-green">
                        {p.score}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={onLeave}
          className="font-hand cursor-pointer px-1 text-base text-ink-soft/70 underline decoration-wavy hover:text-crayon-red"
        >
          leave
        </button>
      </div>
    </div>
  );
}
