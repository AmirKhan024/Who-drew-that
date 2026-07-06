"use client";

import { motion, useReducedMotion } from "framer-motion";

// Little anthropomorphized pencil mascot, drawn in the doodle ink-line style.
// Balances on its point with a gentle idle wobble; one arm gives a small wave.
const INK = "#2a2620";

export default function PencilMascot({ size = 66 }: { size?: number }) {
  const reduce = useReducedMotion();
  // viewBox is 100 x 150 (tall). Height drives the size; width scales with it.
  const height = size;
  const width = (size * 100) / 150;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox="0 0 100 150"
      role="img"
      aria-label="A friendly pencil mascot"
      initial={reduce ? undefined : { rotate: 0 }}
      animate={reduce ? undefined : { rotate: [-3.5, 3.5, -3.5] }}
      transition={
        reduce
          ? undefined
          : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
      }
      style={{ transformOrigin: "50px 130px", overflow: "visible" }}
    >
      <g
        strokeLinejoin="round"
        strokeLinecap="round"
        stroke={INK}
        strokeWidth={3.4}
      >
        {/* ---- fills (no stroke), tiling the silhouette ---- */}
        {/* eraser */}
        <path
          d="M30,30 L30,22 Q30,14 38,14 L62,14 Q70,14 70,22 L70,30 Z"
          fill="#f4a6c1"
          stroke="none"
        />
        {/* ferrule */}
        <rect x="30" y="30" width="40" height="11" fill="#c6ccd4" stroke="none" />
        {/* barrel */}
        <rect x="30" y="41" width="40" height="55" fill="#f5b53c" stroke="none" />
        {/* wood taper */}
        <path
          d="M30,96 L70,96 L58,117 L42,117 Z"
          fill="#eccfa0"
          stroke="none"
        />
        {/* graphite point */}
        <path d="M42,117 L58,117 L50,131 Z" fill="#3a3630" stroke="none" />

        {/* ---- ink outlines ---- */}
        {/* full silhouette */}
        <path
          d="M30,30 L30,22 Q30,14 38,14 L62,14 Q70,14 70,22 L70,30 L70,96 L50,131 L30,96 Z"
          fill="none"
        />
        {/* ferrule band divider lines + ticks */}
        <path d="M30,30 L70,30 M30,41 L70,41" fill="none" strokeWidth={2.6} />
        <path
          d="M42,31 L42,40 M50,31 L50,40 M58,31 L58,40"
          fill="none"
          strokeWidth={2.2}
        />
        {/* wood / graphite division */}
        <path d="M42,117 L58,117" fill="none" strokeWidth={2.6} />

        {/* ---- face ---- */}
        <circle cx="37" cy="76" r="5.5" fill="#f6a8be" stroke="none" opacity={0.85} />
        <circle cx="63" cy="76" r="5.5" fill="#f6a8be" stroke="none" opacity={0.85} />
        <circle cx="43" cy="66" r="2.6" fill={INK} stroke="none" />
        <circle cx="57" cy="66" r="2.6" fill={INK} stroke="none" />
        <path d="M43,74 Q50,81 57,74" fill="none" strokeWidth={2.8} />

        {/* ---- waving arm ---- */}
        <motion.g
          fill="none"
          strokeWidth={3.4}
          style={{ transformOrigin: "30px 66px" }}
          animate={reduce ? undefined : { rotate: [0, -16, 0] }}
          transition={
            reduce
              ? undefined
              : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <path d="M30,66 Q18,64 12,50" />
          <circle cx="11" cy="48" r="4" fill="#f5b53c" />
        </motion.g>

        {/* ---- squiggle it just doodled ---- */}
        <path
          d="M40,140 q4,-6 8,-1 q4,5 8,-1"
          fill="none"
          strokeWidth={2.6}
          stroke="#4b8ed6"
          opacity={0.9}
        />
      </g>
    </motion.svg>
  );
}
