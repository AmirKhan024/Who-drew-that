"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import DoodleBg from "@/components/ui/DoodleBg";
import DoodleButton from "@/components/ui/DoodleButton";
import StickyCard from "@/components/ui/StickyCard";
import WobbleInput from "@/components/ui/WobbleInput";
import PencilMascot from "@/components/ui/PencilMascot";
import { getIdentity, randomAvatarSeed, saveIdentity } from "@/lib/identity";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [seed, setSeed] = useState("start");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getIdentity();
    if (id) {
      setName(id.name);
      setSeed(id.avatarSeed || randomAvatarSeed());
    } else {
      setSeed(randomAvatarSeed());
    }
    setReady(true);
  }, []);

  const go = (path: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveIdentity({ name: trimmed.slice(0, 20), avatarSeed: seed });
    router.push(path);
  };

  const canGo = name.trim().length > 0;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <DoodleBg />

      <div className="mb-2 text-center">
        <Logo />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-scribble mt-3 text-xl text-ink-soft"
        >
          Everyone sketches the secret word… except the imposters. 🕵️
        </motion.p>
      </div>

      <StickyCard color="paper" tilt={-1} seed={21} className="mt-7 w-full max-w-sm">
        <div className="flex flex-col items-center gap-5">
          <motion.div
            initial={{ scale: 0.6, y: -8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 12 }}
            className="-mb-1 mt-1"
          >
            <PencilMascot size={68} />
          </motion.div>

          <WobbleInput
            aria-label="Your name"
            placeholder="Your name…"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go("/create")}
            className="w-full"
            seed={9}
          />

          <div className="mt-1 flex w-full flex-col gap-3">
            <DoodleButton
              variant="green"
              size="lg"
              block
              disabled={!canGo}
              seed={31}
              onClick={() => go("/create")}
            >
              ✏️ Create Room
            </DoodleButton>
            <DoodleButton
              variant="blue"
              size="lg"
              block
              disabled={!canGo}
              seed={44}
              onClick={() => go("/join")}
            >
              🚪 Join Room
            </DoodleButton>
          </div>
          {!canGo && ready && (
            <p className="font-hand text-base text-ink-soft/70">
              Pick a name to start ↑
            </p>
          )}
        </div>
      </StickyCard>

      <Link
        href="/how-to-play"
        className="font-hand mt-6 text-lg text-ink-soft underline decoration-wavy underline-offset-4 transition hover:text-crayon-purple"
      >
        How to play?
      </Link>

      <p className="font-hand mt-3 text-center text-base text-ink-soft/60">
        3+ players · draw · bluff · vote · repeat
      </p>
    </main>
  );
}
