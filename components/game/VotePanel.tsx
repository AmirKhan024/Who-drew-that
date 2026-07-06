"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import DoodleAvatar from "@/components/ui/DoodleAvatar";
import RoughBox from "@/components/ui/RoughBox";
import type { PlayerRow } from "@/lib/supabase/types";
import { getPlayerId } from "@/lib/identity";
import { submitVote } from "@/lib/rooms";
import { getSupabase } from "@/lib/supabase/client";

export default function VotePanel({
  code,
  round,
  players,
  onlineIds,
}: {
  code: string;
  round: number;
  players: PlayerRow[];
  onlineIds?: Set<string>;
}) {
  const myId = getPlayerId();
  const [voted, setVoted] = useState<string | null>(null);
  const [voters, setVoters] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Live "how many have voted" via broadcast (never the choices themselves).
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb
      .channel(`votes:${code}:${round}`)
      .on("broadcast", { event: "voted" }, ({ payload }) => {
        setVoters((s) => new Set(s).add(payload.voterId));
      });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      sb.removeChannel(ch);
    };
  }, [code, round]);

  const castVote = (targetId: string) => {
    setVoted(targetId);
    submitVote(code, targetId);
    setVoters((s) => new Set(s).add(myId));
    channelRef.current?.send({
      type: "broadcast",
      event: "voted",
      payload: { voterId: myId },
    });
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <h2 className="font-display text-2xl">🗳️ Who&apos;s the imposter?</h2>
      <p className="font-hand text-lg text-ink-soft">
        {voted ? "Vote locked — tap to change." : "Tap a player to vote."}
        <span className="ml-2 text-crayon-green">
          {voters.size}/{players.length} voted
        </span>
      </p>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((p) => {
          const isMe = p.id === myId;
          const chosen = voted === p.id;
          const off = onlineIds && !onlineIds.has(p.id);
          return (
            <motion.button
              key={p.id}
              whileTap={isMe ? undefined : { scale: 0.94 }}
              disabled={isMe}
              onClick={() => !isMe && castVote(p.id)}
              className={`relative flex flex-col items-center gap-1 px-2 py-3 ${
                isMe ? "opacity-45" : "cursor-pointer"
              }`}
            >
              <RoughBox
                fill={chosen ? "var(--color-crayon-red)" : "#ffffff"}
                seed={p.id.charCodeAt(0) + p.id.charCodeAt(3)}
                radius={14}
              />
              <div
                className={`relative z-10 flex flex-col items-center gap-1 ${
                  off ? "opacity-40 grayscale" : ""
                }`}
              >
                <DoodleAvatar seed={p.avatar_seed || p.name} size={48} />
                <span
                  className={`font-hand max-w-[8rem] truncate text-lg ${
                    chosen ? "text-white" : ""
                  }`}
                >
                  {p.name}
                  {isMe && " (you)"}
                </span>
                {chosen && <span className="text-lg">✅</span>}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
