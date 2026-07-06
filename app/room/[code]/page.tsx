"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import DoodleBg from "@/components/ui/DoodleBg";
import DoodleButton from "@/components/ui/DoodleButton";
import StickyCard from "@/components/ui/StickyCard";
import DoodleAvatar from "@/components/ui/DoodleAvatar";
import OfflineNotice from "@/components/ui/OfflineNotice";
import RoughBox from "@/components/ui/RoughBox";
import { normalizeRoomCode } from "@/lib/roomCode";
import { getIdentity } from "@/lib/identity";
import { useRoom } from "@/lib/useRoom";
import { claimHost, joinRoom, leaveRoom, setReady, startGame } from "@/lib/rooms";
import { canStartGame } from "@/lib/game/settings";
import { PLAYER_LIMITS, maxImpostersFor } from "@/lib/game/constants";
import { celebrate } from "@/lib/confetti";
import type { PlayerRow } from "@/lib/supabase/types";
import GameScreen from "@/components/game/GameScreen";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = normalizeRoomCode(rawCode);
  const router = useRouter();
  const { room, players, onlineIds, uid, me, loading, error, configured } =
    useRoom(code);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const autoJoinTried = useRef(false);
  const prevAllReady = useRef(false);

  // Re-join automatically on refresh / direct link if we have an identity.
  useEffect(() => {
    if (loading || !configured) return;
    if (!room) return;
    if (me || autoJoinTried.current) return;
    autoJoinTried.current = true;
    const identity = getIdentity();
    if (!identity) {
      router.replace("/");
      return;
    }
    if (room.status === "lobby") joinRoom(code, identity);
  }, [loading, configured, room, me, code, router]);

  // Host migration: if the host is offline and I'm the earliest online player,
  // ask the server to re-pick the host. Fires once per stale host_id.
  const claimedFor = useRef<string>("");
  useEffect(() => {
    if (!room || !uid || onlineIds.size === 0) return;
    if (onlineIds.has(room.host_id)) return; // host present
    const earliestOnline = players.find((p) => onlineIds.has(p.id));
    if (earliestOnline?.id !== uid) return;
    if (claimedFor.current === room.host_id) return;
    claimedFor.current = room.host_id;
    claimHost(code, Array.from(onlineIds));
  }, [room, uid, onlineIds, players, code]);

  const allReady =
    players.length >= PLAYER_LIMITS.MIN && players.every((p) => p.is_ready);

  // Confetti the moment everyone's ready.
  useEffect(() => {
    if (allReady && !prevAllReady.current) celebrate();
    prevAllReady.current = allReady;
  }, [allReady]);

  const copyCode = async () => {
    try {
      const link =
        typeof window !== "undefined"
          ? `${window.location.origin}/join?code=${code}`
          : code;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — code is visible anyway */
    }
  };

  const onLeave = async () => {
    await leaveRoom(code);
    router.push("/");
  };

  const onStart = async () => {
    setStarting(true);
    setStartError(null);
    const res = await startGame(code);
    if (!res.ok) {
      setStartError(res.error ?? "Couldn't start. Try again.");
      setStarting(false);
    }
  };

  // ---- render states -------------------------------------------------
  if (!configured) {
    return (
      <Shell>
        <OfflineNotice />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="font-display animate-pulse text-2xl text-ink-soft">
          Opening the room… ✏️
        </p>
      </Shell>
    );
  }

  if (!room) {
    return (
      <Shell>
        <StickyCard color="pink" className="max-w-sm text-center">
          <p className="font-display mb-1 text-2xl">Room not found 🫥</p>
          <p className="font-hand mb-4 text-lg text-ink-soft">
            {error ?? "That code has expired or never existed."}
          </p>
          <Link href="/">
            <DoodleButton variant="green">Back to start</DoodleButton>
          </Link>
        </StickyCard>
      </Shell>
    );
  }

  if (room.status !== "lobby") {
    if (!me) {
      return (
        <Shell>
          <StickyCard color="yellow" tilt={-1.5} className="max-w-sm text-center">
            <div className="text-5xl">🎬</div>
            <h2 className="font-display mt-2 text-2xl">Game in progress</h2>
            <p className="font-hand mt-1 text-lg text-ink-soft">
              This room already started a game. Hang tight for the next one, or
              start your own!
            </p>
            <div className="mt-4">
              <Link href="/">
                <DoodleButton variant="green">Back to start</DoodleButton>
              </Link>
            </div>
          </StickyCard>
        </Shell>
      );
    }
    return (
      <GameScreen
        code={code}
        room={room}
        players={players}
        me={me}
        isHost={me.is_host}
        onlineIds={onlineIds}
      />
    );
  }

  const isHost = me?.is_host ?? false;
  const startCheck = canStartGame(players.length, room.settings);
  const maxImp = maxImpostersFor(Math.max(players.length, 1));

  return (
    <main className="relative flex min-h-dvh flex-col items-center px-5 py-6">
      <DoodleBg />

      <div className="flex w-full max-w-lg items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <button
          onClick={onLeave}
          className="font-hand cursor-pointer text-lg text-ink-soft/70 underline decoration-wavy underline-offset-4 hover:text-crayon-red"
        >
          Leave
        </button>
      </div>

      {/* Room code / invite */}
      <motion.button
        onClick={copyCode}
        whileTap={{ scale: 0.96 }}
        className="relative mt-5 cursor-pointer px-8 py-3"
      >
        <RoughBox fill="var(--color-note-yellow)" seed={77} radius={14} />
        <div className="relative z-10 text-center">
          <div className="font-hand text-sm text-ink-soft">
            room code — tap to copy invite
          </div>
          <div className="font-display text-5xl tracking-[0.35em] leading-none">
            {code}
          </div>
        </div>
      </motion.button>
      <AnimatePresence>
        {copied && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-hand mt-2 text-lg text-crayon-green"
          >
            ✓ Invite link copied!
          </motion.p>
        )}
      </AnimatePresence>

      {/* Settings summary */}
      <div className="font-hand mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-base text-ink-soft">
        <span>🕵️ {room.settings.imposterCount} imposter(s)</span>
        <span>⏱️ {room.settings.turnDurationSec}s turns</span>
        <span>🏆 {room.settings.rounds} rounds</span>
        <span>🔁 {room.settings.drawingCycles}× each</span>
      </div>

      {/* Players */}
      <div className="mt-5 w-full max-w-lg">
        <div className="font-display mb-2 flex items-center justify-between px-1 text-xl">
          <span>Players</span>
          <span className="text-ink-soft">
            {players.length}
            <span className="text-base"> joined</span>
          </span>
        </div>
        <StickyCard color="paper" tilt={-0.4} seed={33}>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {players.map((p, i) => (
                <PlayerRowItem
                  key={p.id}
                  player={p}
                  online={onlineIds.has(p.id)}
                  isMe={p.id === uid}
                  index={i}
                />
              ))}
            </AnimatePresence>
            {players.length === 0 && (
              <li className="font-hand py-3 text-center text-ink-soft">
                Waiting for players…
              </li>
            )}
          </ul>
        </StickyCard>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {me && !isHost && (
          <DoodleButton
            variant={me.is_ready ? "green" : "yellow"}
            size="lg"
            seed={45}
            onClick={() => setReady(uid!, !me.is_ready)}
          >
            {me.is_ready ? "✓ Ready!" : "I'm Ready"}
          </DoodleButton>
        )}

        {isHost && (
          <>
            <DoodleButton
              variant="green"
              size="lg"
              seed={55}
              disabled={!startCheck.ok || !allReady || starting}
              onClick={onStart}
            >
              {starting ? "Starting…" : "🚀 Start Game"}
            </DoodleButton>
            <p className="font-hand text-center text-base text-ink-soft/80">
              {!startCheck.ok
                ? startCheck.reason
                : !allReady
                  ? "Waiting for everyone to be ready…"
                  : `Everyone's ready! (up to ${maxImp} imposters possible)`}
            </p>
            {startError && (
              <p className="font-hand text-center text-base text-crayon-red">
                ⚠️ {startError}
              </p>
            )}
          </>
        )}

        {!me && (
          <p className="font-hand text-lg text-ink-soft">Joining…</p>
        )}
      </div>
    </main>
  );
}

function PlayerRowItem({
  player,
  online,
  isMe,
  index,
}: {
  player: PlayerRow;
  online: boolean;
  isMe: boolean;
  index: number;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -16, rotate: -2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 22 }}
      className="flex items-center gap-3 rounded-xl px-1 py-1"
    >
      <div className="relative">
        <DoodleAvatar seed={player.avatar_seed || player.name} size={44} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
            online ? "bg-crayon-green" : "bg-ink-soft/40"
          }`}
          title={online ? "online" : "away"}
        />
      </div>
      <span className="font-hand truncate text-xl">
        {player.name}
        {isMe && <span className="text-ink-soft/60"> (you)</span>}
      </span>
      {player.is_host && (
        <span className="font-display rounded-full bg-note-yellow px-2 py-0.5 text-sm">
          👑 host
        </span>
      )}
      <span className="ml-auto text-xl">
        {player.is_ready ? "✅" : "⏳"}
      </span>
    </motion.li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-8">
      <DoodleBg />
      {children}
    </main>
  );
}
