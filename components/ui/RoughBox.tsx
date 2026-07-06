"use client";

import { useEffect, useRef, useState } from "react";
import rough from "roughjs";

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M${x + rr},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h - rr}`,
    `Q${x + w},${y + h} ${x + w - rr},${y + h}`,
    `L${x + rr},${y + h}`,
    `Q${x},${y + h} ${x},${y + h - rr}`,
    `L${x},${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    "Z",
  ].join(" ");
}

export interface RoughBoxProps {
  /** Sticky fill colour (CSS value). Omit for transparent. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  radius?: number;
  /** Stable seed so the sketch doesn't re-randomise on every paint. */
  seed?: number;
  fillStyle?: "solid" | "hachure" | "zigzag" | "cross-hatch";
  className?: string;
}

/**
 * Absolutely-positioned SVG that draws a hand-sketched rounded rectangle
 * sized to its parent. Drop it as the first child of a `relative` element.
 */
export default function RoughBox({
  fill,
  stroke = "var(--color-ink)",
  strokeWidth = 2.2,
  roughness = 1.05,
  radius = 14,
  seed = 42,
  fillStyle = "solid",
  className = "",
}: RoughBoxProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Track parent size
  useEffect(() => {
    const svg = svgRef.current;
    const parent = svg?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setSize({ w: Math.round(box.width), h: Math.round(box.height) });
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // (Re)draw when size or style changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.w < 4 || size.h < 4) return;
    svg.innerHTML = "";
    const rc = rough.svg(svg);
    const pad = strokeWidth + 2;
    const d = roundedRectPath(
      pad,
      pad,
      size.w - pad * 2,
      size.h - pad * 2,
      radius,
    );
    const node = rc.path(d, {
      stroke,
      strokeWidth,
      roughness,
      bowing: 0.8,
      seed,
      ...(fill
        ? { fill, fillStyle, fillWeight: 3, hachureGap: 6 }
        : {}),
    });
    svg.appendChild(node);
  }, [size, fill, stroke, strokeWidth, roughness, radius, seed, fillStyle]);

  return (
    <svg
      ref={svgRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    />
  );
}
