"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { getPlayerId } from "@/lib/identity";
import RoughBox from "@/components/ui/RoughBox";

interface Msg {
  id: string;
  playerId: string;
  name: string;
  text: string;
}

export default function ChatBox({
  code,
  round,
  myName,
}: {
  code: string;
  round: number;
  myName: string;
}) {
  const myId = getPlayerId();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`chat:${code}:${round}`)
      .on("broadcast", { event: "msg" }, ({ payload }) => {
        setMsgs((m) => [...m.slice(-40), payload as Msg]);
      });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      sb.removeChannel(channel);
    };
  }, [code, round]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [msgs]);

  const send = () => {
    const t = text.trim().slice(0, 140);
    if (!t) return;
    const msg: Msg = { id: crypto.randomUUID(), playerId: myId, name: myName, text: t };
    setMsgs((m) => [...m.slice(-40), msg]);
    channelRef.current?.send({ type: "broadcast", event: "msg", payload: msg });
    setText("");
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div
        ref={listRef}
        className="flex h-64 flex-col gap-1.5 overflow-y-auto rounded-2xl border-[3px] border-ink bg-white/70 p-3"
      >
        {msgs.length === 0 && (
          <p className="font-hand m-auto text-center text-lg text-ink-soft/70">
            Who looked suspicious? 👀<br />Call them out!
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.playerId === myId;
          return (
            <div
              key={m.id}
              className={`font-hand max-w-[80%] rounded-2xl px-3 py-1.5 text-lg ${
                mine
                  ? "self-end bg-note-blue"
                  : "self-start bg-note-yellow"
              }`}
            >
              {!mine && (
                <span className="font-display mr-1 text-sm text-ink-soft">
                  {m.name}:
                </span>
              )}
              {m.text}
            </div>
          );
        })}
      </div>
      <div className="relative flex items-center">
        <RoughBox fill="#ffffff" seed={19} radius={12} strokeWidth={2.2} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={140}
          placeholder="Type a message…"
          className="font-hand relative z-10 w-full bg-transparent px-4 py-2.5 text-lg focus:outline-none"
        />
        <button
          onClick={send}
          className="font-display relative z-10 shrink-0 px-3 text-2xl"
          aria-label="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
