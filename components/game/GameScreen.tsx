"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import DoodleBg from "@/components/ui/DoodleBg";
import type { PlayerRow, RoomRow } from "@/lib/supabase/types";
import { usePhaseClock } from "@/lib/usePhaseClock";
import { leaveRoom } from "@/lib/rooms";
import GameHud from "./GameHud";
import WordCard from "./WordCard";
import DrawingBoard from "./DrawingBoard";
import ChatBox from "./ChatBox";
import VotePanel from "./VotePanel";
import RevealPanel from "./RevealPanel";
import Scoreboard from "./Scoreboard";
import PhaseTimer from "./PhaseTimer";

const HUD_PHASES = new Set(["word", "drawing", "discussion", "voting"]);

export default function GameScreen({
  code,
  room,
  players,
  me,
  isHost,
  onlineIds,
}: {
  code: string;
  room: RoomRow;
  players: PlayerRow[];
  me: PlayerRow | null;
  isHost: boolean;
  onlineIds: Set<string>;
}) {
  const router = useRouter();
  usePhaseClock(room, isHost, code, onlineIds);
  const myName = me?.name ?? "You";

  const onLeave = async () => {
    await leaveRoom(code);
    router.push("/");
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center gap-3 px-4 py-4">
      <DoodleBg />
      {HUD_PHASES.has(room.phase) && (
        <GameHud
          code={code}
          room={room}
          players={players}
          onlineIds={onlineIds}
          onLeave={onLeave}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={room.phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="flex w-full flex-1 flex-col items-center justify-center"
        >
          {room.phase === "word" && (
            <WordCard code={code} round={room.current_round} endsAt={room.phase_ends_at} />
          )}

          {room.phase === "starting" && (
            <p className="font-display animate-pulse text-2xl text-ink-soft">
              Next round… 🎨
            </p>
          )}

          {room.phase === "drawing" && (
            <DrawingBoard code={code} room={room} players={players} onlineIds={onlineIds} />
          )}

          {room.phase === "discussion" && (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <PhaseTimer endsAt={room.phase_ends_at} total={room.settings.discussionSec} />
                <span className="font-display text-xl">💬 Discuss!</span>
              </div>
              <div className="w-full max-w-md">
                <DrawingBoard code={code} room={room} players={players} onlineIds={onlineIds} readOnly />
              </div>
              <ChatBox code={code} round={room.current_round} myName={myName} />
            </div>
          )}

          {room.phase === "voting" && (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <PhaseTimer endsAt={room.phase_ends_at} total={room.settings.votingSec} />
                <span className="font-display text-xl">🗳️ Vote!</span>
              </div>
              <div className="w-full max-w-sm opacity-90">
                <DrawingBoard code={code} room={room} players={players} onlineIds={onlineIds} readOnly />
              </div>
              <VotePanel code={code} round={room.current_round} players={players} onlineIds={onlineIds} />
            </div>
          )}

          {room.phase === "reveal" && room.reveal && (
            <RevealPanel reveal={room.reveal} players={players} />
          )}

          {room.phase === "scoreboard" && (
            <Scoreboard players={players} round={room.current_round} totalRounds={room.total_rounds} />
          )}

          {room.phase === "ended" && (
            <Scoreboard players={players} round={room.current_round} totalRounds={room.total_rounds} final />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
