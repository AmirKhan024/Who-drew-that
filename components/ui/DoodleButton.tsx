"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import RoughBox from "./RoughBox";

const VARIANTS: Record<string, string> = {
  red: "var(--color-crayon-red)",
  yellow: "var(--color-crayon-yellow)",
  green: "var(--color-crayon-green)",
  blue: "var(--color-crayon-blue)",
  purple: "var(--color-crayon-purple)",
  teal: "var(--color-crayon-teal)",
  paper: "#ffffff",
};

type Variant = keyof typeof VARIANTS;

export interface DoodleButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  seed?: number;
  block?: boolean;
}

const SIZES = {
  sm: "px-4 py-1.5 text-base",
  md: "px-6 py-2.5 text-lg",
  lg: "px-8 py-3.5 text-2xl",
};

export default function DoodleButton({
  children,
  variant = "yellow",
  size = "md",
  seed = 12,
  block = false,
  className = "",
  disabled,
  ...rest
}: DoodleButtonProps) {
  const fill = VARIANTS[variant];
  const darkText = variant === "yellow" || variant === "paper";
  return (
    <motion.button
      whileHover={disabled ? undefined : { rotate: -1.5, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.94, y: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      disabled={disabled}
      className={`font-display relative inline-flex select-none items-center justify-center gap-2 font-semibold ${
        SIZES[size]
      } ${darkText ? "text-ink" : "text-white"} ${
        block ? "w-full" : ""
      } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"} ${className}`}
      {...rest}
    >
      <RoughBox
        fill={fill}
        seed={seed}
        radius={13}
        roughness={1.15}
        strokeWidth={2.4}
      />
      <span
        className="relative z-10 flex items-center gap-2"
        style={{ textShadow: darkText ? "none" : "1px 1px 0 rgba(0,0,0,.18)" }}
      >
        {children}
      </span>
    </motion.button>
  );
}
