"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Reading your resume PDF",
  "Comparing resume with the job description",
  "Finding skill gaps and missing keywords",
  "Writing optimized bullet points",
] as const;

const STEP_INTERVAL_MS = 5000;
const SLOW_NOTICE_AFTER_S = 20;

export default function LoadingPanel({ fileName }: { fileName?: string }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(4);
  const [elapsed, setElapsed] = useState(0);

  // Progress eases toward 92% and never completes until the response arrives.
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((value) => value + 0.4);
      setProgress((value) => value + (92 - value) * 0.035);
    }, 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setStep((value) => Math.min(value + 1, STEPS.length - 1)),
      STEP_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div role="status" aria-live="polite" className="card mx-auto max-w-2xl text-center">
      <div className="relative mx-auto mb-6 h-20 w-20">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-teal-100 border-t-brand-teal" />
        <span className="absolute inset-0 flex items-center justify-center text-brand-teal">
          <Sparkles className="h-7 w-7 animate-pulse" aria-hidden />
        </span>
      </div>

      <h2 className="text-xl font-bold text-brand-navy">Analyzing your resume…</h2>
      <p className="mt-1 text-sm text-slate-500">
        {fileName ? `Processing ${fileName}. ` : ""}This usually takes 10-20 seconds.
      </p>

      <div
        className="mx-auto mt-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-teal to-teal-400 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left">
        {STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors",
                done ? "text-slate-500" : active ? "font-medium text-slate-900" : "text-slate-400",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-green-500 text-white" : active ? "text-brand-teal" : "text-slate-300",
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              {label}
            </li>
          );
        })}
      </ul>

      {elapsed > SLOW_NOTICE_AFTER_S && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Taking a little longer than usual. The AI model may be busy, and we are retrying
          automatically.
        </p>
      )}
    </div>
  );
}
