"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { getPlayerId } from "@/lib/identity";
import { commitStroke } from "@/lib/rooms";
import type { PlayerRow, RoomRow, StrokeRow } from "@/lib/supabase/types";
import DoodleAvatar from "@/components/ui/DoodleAvatar";
import PhaseTimer from "./PhaseTimer";

type Pt = { x: number; y: number };
interface Stroke {
  id: string;
  player_id: string;
  color: string;
  points: Pt[];
}

const PALETTE = [
  "#2b2a28",
  "#ff5a5f",
  "#4a90e2",
  "#4ac29a",
  "#ffcf3f",
  "#9b7bea",
  "#ff7eb6",
];

export default function DrawingBoard({
  code,
  room,
  players,
  onlineIds,
  readOnly = false,
}: {
  code: string;
  room: RoomRow;
  players: PlayerRow[];
  onlineIds?: Set<string>;
  readOnly?: boolean;
}) {
  const myId = getPlayerId();
  const roundNumber = room.current_round;
  const activeId = room.turn_order?.[room.turn_index];
  const isMyTurn =
    !readOnly && room.phase === "drawing" && activeId === myId;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const committed = useRef<Map<string, Stroke>>(new Map());
  const remoteLive = useRef<Map<string, Stroke>>(new Map());
  const localStroke = useRef<Stroke | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [color, setColor] = useState(PALETTE[0]);
  const lastSent = useRef(0);

  const nameOf = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p.name]));
    return (id?: string) => (id ? m.get(id) ?? "Someone" : "");
  }, [players]);

  // ---- rendering ----------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const all = [
      ...committed.current.values(),
      ...remoteLive.current.values(),
      ...(localStroke.current ? [localStroke.current] : []),
    ];
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const s of all) {
      if (s.points.length < 1) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
      for (const p of s.points) ctx.lineTo(p.x * w, p.y * h);
      if (s.points.length === 1)
        ctx.lineTo(s.points[0].x * w + 0.1, s.points[0].y * h + 0.1);
      ctx.stroke();
    }
  }, []);

  const repaint = useCallback(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // ---- canvas sizing (fixed internal res, scaled by CSS) -----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1000;
    canvas.height = 680;
    draw();
  }, [draw]);

  // ---- load history + subscribe to realtime -------------------------
  useEffect(() => {
    committed.current = new Map();
    remoteLive.current = new Map();
    localStroke.current = null;
    repaint();

    const sb = getSupabase();
    if (!sb) return;

    (async () => {
      const { data } = await sb
        .from("strokes")
        .select("*")
        .eq("room_code", code)
        .eq("round_number", roundNumber)
        .order("seq", { ascending: true });
      for (const row of (data as StrokeRow[]) ?? []) {
        committed.current.set(row.id, {
          id: row.id,
          player_id: row.player_id,
          color: row.color,
          points: row.points,
        });
      }
      repaint();
    })();

    const channel = sb
      .channel(`draw:${code}:${roundNumber}`)
      .on("broadcast", { event: "live" }, ({ payload }) => {
        if (payload.playerId === myId) return;
        remoteLive.current.set(payload.playerId, {
          id: "live-" + payload.playerId,
          player_id: payload.playerId,
          color: payload.color,
          points: payload.points,
        });
        repaint();
      })
      .on("broadcast", { event: "commit" }, ({ payload }) => {
        const s = payload.stroke as Stroke;
        committed.current.set(s.id, s);
        remoteLive.current.delete(s.player_id);
        repaint();
      })
      .on("broadcast", { event: "clear" }, () => {
        committed.current.clear();
        remoteLive.current.clear();
        repaint();
      });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, roundNumber, myId, repaint]);

  // ---- pointer input ------------------------------------------------
  const toNorm = (e: React.PointerEvent): Pt => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  const sendLive = () => {
    const now = Date.now();
    if (now - lastSent.current < 45) return;
    lastSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "live",
      payload: {
        playerId: myId,
        color,
        points: localStroke.current?.points ?? [],
      },
    });
  };

  const onDown = (e: React.PointerEvent) => {
    if (!isMyTurn) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    localStroke.current = {
      id: crypto.randomUUID(),
      player_id: myId,
      color,
      points: [toNorm(e)],
    };
    repaint();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!isMyTurn || !localStroke.current) return;
    localStroke.current.points.push(toNorm(e));
    sendLive();
    repaint();
  };
  const onUp = async () => {
    const s = localStroke.current;
    localStroke.current = null;
    if (!s || s.points.length === 0) return;
    committed.current.set(s.id, s); // optimistic
    repaint();
    channelRef.current?.send({
      type: "broadcast",
      event: "commit",
      payload: { stroke: s },
    });
    // Persist through the server, which verifies it's actually our turn.
    await commitStroke(code, { id: s.id, color: s.color, points: s.points });
  };

  const turnName = isMyTurn ? "Your turn!" : `${nameOf(activeId)} is drawing`;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="font-display text-xl">
            {isMyTurn ? (
              <span className="text-crayon-green">✏️ Your turn!</span>
            ) : (
              <span className="text-ink-soft">✏️ {turnName}</span>
            )}
          </div>
          {room.phase === "drawing" && (room.turn_order?.length ?? 0) > 0 && (
            <span className="font-display rounded-full border-2 border-ink bg-white px-2 py-0.5 text-sm text-ink-soft">
              turn {room.turn_index + 1}/{room.turn_order.length}
            </span>
          )}
        </div>
        {room.phase === "drawing" && (
          <PhaseTimer
            endsAt={room.phase_ends_at}
            total={room.settings.turnDurationSec}
            size={50}
          />
        )}
      </div>

      {!readOnly && (
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          {players.map((p) => {
            const active = p.id === activeId;
            const off = onlineIds && !onlineIds.has(p.id);
            return (
              <div
                key={p.id}
                title={p.name + (off ? " (offline)" : "")}
                className={`rounded-full transition ${
                  active ? "ring-[3px] ring-crayon-green" : ""
                } ${off ? "opacity-35 grayscale" : ""}`}
              >
                <DoodleAvatar seed={p.avatar_seed || p.name} size={30} />
              </div>
            );
          })}
        </div>
      )}

      <div className="relative w-full" style={{ aspectRatio: "1000 / 680" }}>
        <div className="absolute inset-0 rounded-2xl border-[3px] border-ink bg-white shadow-[var(--shadow-sticker)]" />
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`absolute inset-0 h-full w-full touch-none rounded-2xl ${
            isMyTurn ? "cursor-crosshair" : "cursor-not-allowed"
          }`}
        />
      </div>

      {isMyTurn && (
        <div className="flex items-center gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`colour ${c}`}
              className={`h-8 w-8 rounded-full border-[3px] transition ${
                color === c
                  ? "scale-125 border-ink"
                  : "border-white hover:scale-110"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
