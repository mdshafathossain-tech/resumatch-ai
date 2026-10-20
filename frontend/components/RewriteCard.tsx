"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface RewriteCardProps {
  original: string;
  suggested: string;
  /** 1-based position shown in the card header. */
  index?: number;
}

const PLACEHOLDER_SPLIT = /(\[[^\]]+\])/g;
const PLACEHOLDER_ONLY = /^\[[^\]]+\]$/;

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy approach
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Highlights [X%]-style placeholders so users remember to fill in real numbers. */
function renderWithPlaceholders(text: string) {
  return text.split(PLACEHOLDER_SPLIT).map((part, i) =>
    PLACEHOLDER_ONLY.test(part) ? (
      <mark
        key={i}
        title="Replace with your real number"
        className="rounded bg-amber-100 px-1 font-medium text-amber-900"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export default function RewriteCard({ original, suggested, index }: RewriteCardProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPlaceholders = /\[[^\]]+\]/.test(suggested);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(suggested);
    setStatus(ok ? "copied" : "failed");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 2000);
  }, [suggested]);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {index !== undefined && (
        <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Lightbulb className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
          Suggestion {index}
        </header>
      )}

      <div className="grid md:grid-cols-2">
        {/* Original */}
        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden />
            Original resume bullet
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
            {original}
          </p>
        </div>

        {/* Suggested */}
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-teal">
              <span className="h-2 w-2 rounded-full bg-brand-teal" aria-hidden />
              AI-suggested bullet
            </p>

            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy suggested bullet to clipboard"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                status === "copied"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : status === "failed"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={status}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.12 }}
                  className="inline-flex"
                >
                  {status === "copied" ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                </motion.span>
              </AnimatePresence>
              <span aria-live="polite">
                {status === "copied" ? "Copied!" : status === "failed" ? "Copy failed" : "Copy"}
              </span>
            </button>
          </div>

          <p className="rounded-xl border border-teal-200 bg-brand-mint/60 p-3 text-sm leading-relaxed text-slate-800">
            {renderWithPlaceholders(suggested)}
          </p>

          {hasPlaceholders && (
            <p className="mt-2 text-xs text-amber-700">
              Replace the highlighted placeholders with your real numbers before using this bullet.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
