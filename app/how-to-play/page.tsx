"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import DoodleBg from "@/components/ui/DoodleBg";
import DoodleButton from "@/components/ui/DoodleButton";
import StickyCard from "@/components/ui/StickyCard";

const STEPS = [
  {
    icon: "🎨",
    title: "1 · Get your word",
    body: "Everyone sees the same secret word — everyone except the imposter, who gets a different one (and doesn't know yours).",
  },
  {
    icon: "✏️",
    title: "2 · Draw together",
    body: "Take turns adding to one shared canvas, a few seconds each. The imposter has to fake it and blend in.",
  },
  {
    icon: "💬",
    title: "3 · Discuss",
    body: "Whose strokes looked off? Argue it out in the chat — but don't say the word out loud!",
  },
  {
    icon: "🗳️",
    title: "4 · Vote & reveal",
    body: "Secretly vote who you think the imposter is. Then the truth comes out — and points are scored.",
  },
];

export default function HowToPlay() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center px-5 py-8">
      <DoodleBg />

      <Link href="/" className="self-start">
        <Logo size="sm" />
      </Link>

      <motion.h2
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display mt-4 text-3xl sm:text-4xl"
      >
        How to Play
      </motion.h2>
      <p className="font-hand mb-6 mt-1 text-lg text-ink-soft">
        Draw · bluff · catch the imposter. 3+ players.
      </p>

      {/* The golden rule */}
      <StickyCard color="yellow" tilt={-1.2} tape seed={99} className="mb-5 w-full max-w-md">
        <div className="flex gap-3">
          <div className="text-4xl">💡</div>
          <div>
            <h3 className="font-display text-2xl">The golden rule</h3>
            <p className="font-hand mt-1 text-lg leading-snug">
              <b>Don&apos;t draw the word too obviously!</b> If the word is{" "}
              <b>House</b> and you just draw a big clear house, the imposter
              instantly knows the word and blends right in. Instead, hint at it —
              draw a chimney, a doorknob, a welcome mat — enough to prove you know
              it, without handing it to the faker. 🤫
            </p>
          </div>
        </div>
      </StickyCard>

      <div className="grid w-full max-w-md gap-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <StickyCard color="paper" tilt={i % 2 ? 0.6 : -0.6} seed={40 + i}>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{s.icon}</div>
                <div>
                  <h4 className="font-display text-xl">{s.title}</h4>
                  <p className="font-hand text-lg leading-snug text-ink-soft">
                    {s.body}
                  </p>
                </div>
              </div>
            </StickyCard>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 max-w-md text-center">
        <p className="font-hand text-lg text-ink-soft">
          <b className="text-crayon-green">Crew</b> win by voting out the imposter.{" "}
          <b className="text-crayon-red">Imposters</b> win by surviving the vote —
          and by fooling as many players as they can.
        </p>
      </div>

      <div className="mt-6">
        <Link href="/">
          <DoodleButton variant="green" size="lg" seed={70}>
            Got it — let&apos;s play!
          </DoodleButton>
        </Link>
      </div>
    </main>
  );
}
