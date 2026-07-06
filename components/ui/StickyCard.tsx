"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import RoughBox from "./RoughBox";

const NOTE_FILLS: Record<string, string> = {
  yellow: "var(--color-note-yellow)",
  pink: "var(--color-note-pink)",
  blue: "var(--color-note-blue)",
  green: "var(--color-note-green)",
  paper: "#ffffff",
  none: "",
};

export interface StickyCardProps {
  children: ReactNode;
  color?: keyof typeof NOTE_FILLS;
  /** degrees of hand-placed tilt */
  tilt?: number;
  tape?: boolean;
  seed?: number;
  className?: string;
}

/**
 * A sticky-note / index-card surface with a hand-drawn rough border,
 * a slight tilt, and an optional strip of masking tape.
 */
export default function StickyCard({
  children,
  color = "paper",
  tilt = -1.2,
  tape = false,
  seed = 7,
  className = "",
}: StickyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, rotate: tilt * 2 }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className={`relative ${className}`}
      style={{
        rotate: `${tilt}deg`,
        filter: "drop-shadow(2px 4px 0 rgba(42,38,32,0.10))",
      }}
    >
      <RoughBox fill={NOTE_FILLS[color]} seed={seed} radius={16} />
      {tape && (
        <span
          className="tape left-1/2 -top-3 -translate-x-1/2 rotate-[-3deg]"
          aria-hidden
        />
      )}
      <div className="relative z-10 p-5 sm:p-6">{children}</div>
    </motion.div>
  );
}
