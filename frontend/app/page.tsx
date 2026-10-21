"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, History, PencilLine, RotateCcw, Sparkles, X } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import LoadingPanel from "@/components/LoadingPanel";
import AnalysisReport from "@/components/AnalysisReport";
import { analyzeResume, isRequestCanceled, type AnalysisDetail } from "@/lib/api";
import { cn, MAX_JD_CHARS, MIN_JD_CHARS } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const jdLength = jobDescription.trim().length;
  const jdTooShort = jdLength > 0 && jdLength < MIN_JD_CHARS;
  const jdTooLong = jdLength > MAX_JD_CHARS;
  const canSubmit =
    file !== null && jdLength >= MIN_JD_CHARS && !jdTooLong && status !== "loading";

  // Cancel any in-flight request when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Bring the report into view once it arrives.
  useEffect(() => {
    if (status === "success") {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !canSubmit) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const data = await analyzeResume(file, jobDescription.trim(), jobTitle, {
        signal: controller.signal,
      });
      setResult(data);
      setStatus("success");
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const resetAll = () => {
    setFile(null);
    setJobTitle("");
    setJobDescription("");
    setResult(null);
    setError(null);
    setStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editInputs = () => {
    setResult(null);
    setStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showForm = status === "idle" || status === "error";

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto mb-8 max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-brand-mint px-3 py-1 text-xs font-semibold text-brand-teal">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Semantic AI resume analysis
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          See how well your resume matches the job
        </h1>
        <p className="mt-3 text-slate-600">
          Upload your resume and paste a job description. Get a match score, missing keywords, skill
          gaps and AI-rewritten bullet points in seconds.
        </p>
      </section>

      {/* Input form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mx-auto max-w-3xl space-y-6" noValidate>
          {status === "error" && error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStatus("idle");
                }}
                aria-label="Dismiss error"
                className="rounded p-0.5 text-red-600 hover:bg-red-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              1. Upload your resume
            </label>
            <FileDropzone file={file} onChange={setFile} />
          </div>

          <div>
            <label htmlFor="job-title" className="mb-2 block text-sm font-semibold text-slate-800">
              2. Job title <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="job-title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              maxLength={150}
              placeholder="e.g. Data Analyst"
              className="input"
            />
          </div>

          <div>
            <label
              htmlFor="job-description"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              3. Paste the job description
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={9}
              placeholder="Paste the full job description here, including responsibilities and requirements…"
              aria-invalid={jdTooShort || jdTooLong}
              aria-describedby="jd-help"
              className={cn(
                "input resize-y leading-relaxed",
                (jdTooShort || jdTooLong) && "border-red-400 focus:border-red-500 focus:ring-red-200",
              )}
            />
            <div id="jd-help" className="mt-1.5 flex justify-between text-xs">
              <span className={jdTooShort || jdTooLong ? "text-red-600" : "text-slate-500"}>
                {jdTooShort
                  ? `Add at least ${MIN_JD_CHARS - jdLength} more characters.`
                  : jdTooLong
                    ? `Too long. Maximum is ${MAX_JD_CHARS.toLocaleString()} characters.`
                    : `Minimum ${MIN_JD_CHARS} characters.`}
              </span>
              <span className="tabular-nums text-slate-400">
                {jdLength.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-primary w-full sm:w-auto">
            <Sparkles className="h-4 w-4" aria-hidden />
            Analyze match
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}

      {/* Loading */}
      {status === "loading" && <LoadingPanel fileName={file?.name} />}

      {/* Results */}
      {status === "success" && result && (
        <div ref={resultsRef} className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-brand-navy">Your analysis</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={editInputs} className="btn-secondary">
                <PencilLine className="h-4 w-4" aria-hidden />
                Edit inputs
              </button>
              <button type="button" onClick={resetAll} className="btn-secondary">
                <RotateCcw className="h-4 w-4" aria-hidden />
                New analysis
              </button>
              <Link href="/history" className="btn-secondary">
                <History className="h-4 w-4" aria-hidden />
                View history
              </Link>
            </div>
          </div>

          <AnalysisReport analysis={result} />
        </div>
      )}
    </div>
  );
}