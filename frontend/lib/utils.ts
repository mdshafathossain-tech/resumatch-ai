import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely (later classes win). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Limits mirror the FastAPI backend validation.
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_JD_CHARS = 50;
export const MAX_JD_CHARS = 10_000;

export interface ScoreTone {
  label: string;
  /** Hex colour for SVG strokes and charts. */
  stroke: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

/** Green for 75+, yellow for 50-74, red for below 50. */
export function getScoreTone(score: number): ScoreTone {
  if (score >= 75) {
    return {
      label: "Strong match",
      stroke: "#16a34a",
      text: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      dot: "bg-green-500",
    };
  }
  if (score >= 50) {
    return {
      label: "Partial match",
      stroke: "#eab308",
      text: "text-yellow-700",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
    };
  }
  return {
    label: "Weak match",
    stroke: "#dc2626",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string, style: "short" | "long" = "short"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return style === "short"
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
