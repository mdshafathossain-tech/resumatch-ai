"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { cn, getScoreTone } from "@/lib/utils";

interface ScoreGaugeProps {
  label: string;
  /** 0-100 */
  score: number;
  size?: "lg" | "md";
  /** Animation delay in seconds (useful for staggering several gauges). */
  delay?: number;
  /** Show the verdict ("Strong match", ...) under the number. */
  showVerdict?: boolean;
  className?: string;
}

const SIZES = {
  lg: { px: 190, stroke: 14, number: "text-5xl", caption: "text-base" },
  md: { px: 128, stroke: 10, number: "text-3xl", caption: "text-sm" },
} as const;

// The gauge is a 270 degree arc, open at the bottom.
const ARC_FRACTION = 0.75;

export default function ScoreGauge({
  label,
  score,
  size = "md",
  delay = 0,
  showVerdict = false,
  className,
}: ScoreGaugeProps) {
  const reduceMotion = useReducedMotion();
  const value = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
  const { px, stroke, number, caption } = SIZES[size];
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * ARC_FRACTION;
  const targetOffset = arcLength * (1 - value / 100);
  const tone = getScoreTone(value);

  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, delay, reduceMotion]);

  return (
    <figure className={cn("flex flex-col items-center", className)}>
      <div
        className="relative"
        style={{ width: px, height: px }}
        role="img"
        aria-label={`${label}: ${value} out of 100, ${tone.label}`}
      >
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="block">
          <g transform={`rotate(135 ${px / 2} ${px / 2})`} fill="none" strokeLinecap="round">
            {/* Track */}
            <circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              stroke="#e2e8f0"
              strokeWidth={stroke}
              strokeDasharray={`${arcLength} ${circumference}`}
            />
            {/* Progress */}
            <motion.circle
              cx={px / 2}
              cy={px / 2}
              r={radius}
              stroke={tone.stroke}
              strokeWidth={stroke}
              strokeDasharray={`${arcLength} ${circumference}`}
              initial={{ strokeDashoffset: reduceMotion ? targetOffset : arcLength }}
              animate={{ strokeDashoffset: targetOffset }}
              transition={{ duration: reduceMotion ? 0 : 1.2, delay, ease: "easeOut" }}
            />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className={cn("font-bold tabular-nums text-slate-900", number)}>{display}</span>
            <span className="text-sm font-medium text-slate-400">/100</span>
          </div>
          {showVerdict && (
            <span
              className={cn(
                "mt-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                tone.bg,
                tone.border,
                tone.text,
              )}
            >
              {tone.label}
            </span>
          )}
        </div>
      </div>

      <figcaption className={cn("-mt-3 font-semibold text-slate-700", caption)}>
        {label}
      </figcaption>
    </figure>
  );
}
