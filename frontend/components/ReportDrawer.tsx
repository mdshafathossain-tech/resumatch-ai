"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import AnalysisReport from "@/components/AnalysisReport";
import type { AnalysisDetail } from "@/lib/api";

interface ReportDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  analysis: AnalysisDetail | null;
  onClose: () => void;
  onRetry: () => void;
}

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-64 rounded-2xl bg-slate-200" />
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-40 rounded-2xl bg-slate-200" />
    </div>
  );
}

export default function ReportDrawer({
  open,
  loading,
  error,
  analysis,
  onClose,
  onRetry,
}: ReportDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Analysis report"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-slate-50 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-bold text-brand-navy">Past analysis report</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close report"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {loading && <DrawerSkeleton />}

              {!loading && error && (
                <div
                  role="alert"
                  className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
                >
                  <p className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {error}
                  </p>
                  <button type="button" onClick={onRetry} className="btn-secondary">
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && analysis && <AnalysisReport analysis={analysis} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
