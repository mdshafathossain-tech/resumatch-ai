"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import ReportDrawer from "@/components/ReportDrawer";
import {
  ApiError,
  getHistory,
  getHistoryDetail,
  isRequestCanceled,
  type AnalysisDetail,
  type HistoryItem,
} from "@/lib/api";
import { cn, formatDate, getScoreTone } from "@/lib/utils";

type LoadStatus = "loading" | "ready" | "error";

// Same URL convention as the rest of the app: NEXT_PUBLIC_API_URL, with the deployed API as fallback.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://resumatch-ai-rizc.onrender.com").replace(
  /\/+$/,
  "",
);

interface ChartPoint {
  label: string;
  score: number;
  title: string;
  file: string;
  full: string;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const tone = getScoreTone(point.score);

  return (
    <div className="max-w-[220px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="truncate font-semibold text-slate-900">{point.title}</p>
      <p className="truncate text-slate-500">{point.file}</p>
      <p className="mt-1 text-slate-400">{point.full}</p>
      <p className={cn("mt-2 text-sm font-bold", tone.text)}>{point.score}/100</p>
    </div>
  );
}

function EmptyState({ endpointMissing }: { endpointMissing: boolean }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-mint text-brand-teal ring-8 ring-teal-50">
        <FileSearch className="h-8 w-8" aria-hidden />
      </span>
      <h2 className="text-xl font-bold text-brand-navy">No Analysis History Yet</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Upload your resume and analyze it against job descriptions to track your match scores over
        time.
      </p>
      <Link href="/" className="btn-primary mt-7">
        <Sparkles className="h-4 w-4" aria-hidden />
        Analyze Your First Resume
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      {endpointMissing && (
        <p className="mt-6 max-w-md rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          The history service responded with 404. If you have already run analyses, check that
          NEXT_PUBLIC_API_URL points to your backend.
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  hint?: ReactNode;
}) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4 text-brand-teal" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [endpointMissing, setEndpointMissing] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);
    setEndpointMissing(false);
    try {
      const data = await getHistory(100, 0, signal);
      setItems(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      if (isRequestCanceled(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        // Treat a missing list endpoint as "nothing to show" instead of a red error,
        // but keep a visible hint so a misconfigured API URL is not silently hidden.
        console.warn("GET /api/history returned 404. Check NEXT_PUBLIC_API_URL.");
        setItems([]);
        setEndpointMissing(true);
        setStatus("ready");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load history.");
      setStatus("error");
    }
  }, []);

  const loadDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getHistoryDetail(id, signal);
      setDetail(data);
    } catch (err) {
      if (isRequestCanceled(err)) return;
      setDetailError(err instanceof Error ? err.message : "Failed to load the report.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [loadHistory]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setDetail(null);
    void loadDetail(selectedId, controller.signal);
    return () => controller.abort();
  }, [selectedId, loadDetail]);

  const closeDrawer = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const flashNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  const handleDelete = useCallback(
    async (item: HistoryItem) => {
      if (deletingId) return;

      const confirmed = window.confirm(
        `Delete "${item.job_title}" (${item.resume_filename})?\n\nThis analysis will be permanently removed and cannot be undone.`,
      );
      if (!confirmed) return;

      setDeletingId(item.id);
      setDeleteError(null);
      try {
        const response = await fetch(`${API_URL}/api/history/${encodeURIComponent(item.id)}`, {
          method: "DELETE",
        });

        // A 404 means the record is already gone on the server, so removing it locally is correct.
        if (!response.ok && response.status !== 404) {
          let message = `Could not delete the analysis (status ${response.status}).`;
          try {
            const body = (await response.json()) as { detail?: unknown };
            if (typeof body.detail === "string") message = body.detail;
          } catch {
            // response had no JSON body; keep the generic message
          }
          throw new Error(message);
        }

        // Update local state immediately so the row disappears without a reload.
        setItems((previous) => previous.filter((entry) => entry.id !== item.id));
        setSelectedId((current) => (current === item.id ? null : current));
        flashNotice("Analysis deleted.");
      } catch (err) {
        setDeleteError(
          err instanceof TypeError
            ? "Cannot reach the server. Please check your connection and try again."
            : err instanceof Error
              ? err.message
              : "Could not delete the analysis.",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, flashNotice],
  );

  // Chart data is chronological (the API returns newest first).
  const chartData: ChartPoint[] = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((item) => ({
          label: formatDate(item.created_at, "short"),
          score: item.overall_match_score,
          title: item.job_title,
          file: item.resume_filename,
          full: formatDate(item.created_at, "long"),
        })),
    [items],
  );

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const scores = chartData.map((p) => p.score);
    const latest = scores[scores.length - 1];
    const previous = scores.length > 1 ? scores[scores.length - 2] : null;
    return {
      total: scores.length,
      average: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
      best: Math.max(...scores),
      latest,
      delta: previous === null ? null : latest - previous,
    };
  }, [chartData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.job_title.toLowerCase().includes(q) ||
        item.resume_filename.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy">Analysis history</h1>
          <p className="mt-1 text-slate-600">
            Track your match score over time and revisit any past report.
          </p>
        </div>
        <Link href="/" className="btn-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
          New analysis
        </Link>
      </div>

      {/* Delete feedback */}
      {deleteError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="flex-1">{deleteError}</p>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label="Dismiss error"
            className="rounded p-0.5 text-red-600 hover:bg-red-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {notice}
        </div>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading history">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="h-80 rounded-2xl bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
          <button type="button" onClick={() => void loadHistory()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {status === "ready" && items.length === 0 && <EmptyState endpointMissing={endpointMissing} />}

      {/* Content */}
      {status === "ready" && items.length > 0 && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={BarChart3} label="Total scans" value={String(stats.total)} />
            <StatCard icon={TrendingUp} label="Average score" value={`${stats.average}`} />
            <StatCard icon={Award} label="Best score" value={`${stats.best}`} />
            <StatCard
              icon={Sparkles}
              label="Latest score"
              value={`${stats.latest}`}
              hint={
                stats.delta === null ? (
                  "First scan"
                ) : stats.delta === 0 ? (
                  "No change vs previous"
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      stats.delta > 0 ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {stats.delta > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {stats.delta > 0 ? "+" : ""}
                    {stats.delta} vs previous
                  </span>
                )
              }
            />
          </div>

          {/* Trend chart */}
          <section className="card" aria-label="Overall match score trend">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Overall match score trend</h2>
              {chartData.length < 2 && (
                <span className="text-xs text-slate-500">Run more analyses to see a trend.</span>
              )}
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E8F8C" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0E8F8C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#16a34a"
                    strokeDasharray="5 5"
                    label={{
                      value: "Strong (75+)",
                      position: "insideTopRight",
                      fill: "#16a34a",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#0E8F8C"
                    strokeWidth={2.5}
                    fill="url(#scoreFill)"
                    dot={{ r: 3.5, fill: "#0E8F8C", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#0E8F8C", stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Clickable list */}
          <section className="card !p-0 overflow-hidden" aria-label="Past analyses">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-900">
                Past scans{" "}
                <span className="font-normal text-slate-400">({filtered.length})</span>
              </h2>
              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title or file…"
                  aria-label="Search past scans"
                  className="input !py-2 pl-9"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No scans match your search.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const tone = getScoreTone(item.overall_match_score);
                  return (
                    <li key={item.id} className="flex items-center transition hover:bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="flex min-w-0 flex-1 items-center gap-4 py-4 pl-4 pr-2 text-left sm:pl-6"
                      >
                        <span
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg font-bold tabular-nums",
                            tone.bg,
                            tone.border,
                            tone.text,
                          )}
                          aria-label={`Score ${item.overall_match_score} out of 100`}
                        >
                          {item.overall_match_score}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {item.job_title}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {item.resume_filename}
                          </span>
                        </span>
                        <span className="hidden text-xs text-slate-400 sm:block">
                          {formatDate(item.created_at, "long")}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId !== null}
                        aria-label={`Delete analysis ${item.job_title}`}
                        title="Delete"
                        className="mr-3 shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:mr-5"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <ReportDrawer
        open={selectedId !== null}
        loading={detailLoading}
        error={detailError}
        analysis={detail}
        onClose={closeDrawer}
        onRetry={() => {
          if (selectedId) void loadDetail(selectedId);
        }}
      />
    </div>
  );
}
