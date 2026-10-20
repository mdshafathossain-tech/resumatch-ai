import axios, { type AxiosError, type AxiosInstance } from "axios";

// ---------------------------------------------------------------------------
// Types (mirror backend/app/schemas.py)
// ---------------------------------------------------------------------------
export interface RewrittenBullet {
  original: string;
  suggested: string;
}

export interface AnalysisResult {
  overall_match_score: number;
  hard_skills_score: number;
  soft_skills_score: number;
  missing_keywords: string[];
  skill_gaps: string[];
  rewritten_bullets: RewrittenBullet[];
}

export interface AnalysisDetail extends AnalysisResult {
  id: string;
  resume_filename: string;
  job_title: string;
  job_description: string | null;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  resume_filename: string;
  job_title: string;
  overall_match_score: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // The backend may retry the AI provider several times, so allow plenty of time.
  timeout: 120_000,
  headers: { Accept: "application/json" },
});

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** True when a request was cancelled through an AbortController. */
export const isRequestCanceled = (error: unknown): boolean => axios.isCancel(error);

function extractDetail(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry): string | null => {
        if (!entry || typeof entry !== "object") return null;
        const { loc, msg } = entry as { loc?: unknown[]; msg?: string };
        if (!msg) return null;
        const field = Array.isArray(loc) && loc.length ? String(loc[loc.length - 1]) : "";
        return field ? `${field}: ${msg}` : msg;
      })
      .filter((m): m is string => Boolean(m));
    return messages.length ? messages.join("; ") : null;
  }

  return null;
}

function toApiError(error: unknown): Error {
  if (axios.isCancel(error)) {
    return error instanceof Error ? error : new ApiError("Request canceled.");
  }

  if (axios.isAxiosError(error)) {
    const err = error as AxiosError;
    if (err.response) {
      return new ApiError(
        extractDetail(err.response.data) ??
          `Request failed with status ${err.response.status}.`,
        err.response.status,
      );
    }
    if (err.code === "ECONNABORTED") {
      return new ApiError(
        "The request timed out. The AI service may be busy, please try again.",
      );
    }
    return new ApiError(
      `Cannot reach the server at ${API_BASE_URL}. Make sure the backend is running.`,
    );
  }

  return error instanceof Error ? error : new ApiError("An unexpected error occurred.");
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
export async function analyzeResume(
  file: File,
  jobDescription: string,
  jobTitle?: string,
  options: { signal?: AbortSignal } = {},
): Promise<AnalysisDetail> {
  const form = new FormData();
  form.append("file", file);
  form.append("job_description", jobDescription);
  const title = jobTitle?.trim();
  if (title) form.append("job_title", title);

  try {
    // Do not set Content-Type manually: the browser adds the multipart boundary.
    const { data } = await apiClient.post<AnalysisDetail>("/api/analyze", form, {
      signal: options.signal,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getHistory(
  limit = 50,
  offset = 0,
  signal?: AbortSignal,
): Promise<HistoryItem[]> {
  try {
    const { data } = await apiClient.get<HistoryItem[]>("/api/history", {
      params: { limit, offset },
      signal,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getHistoryDetail(
  id: string,
  signal?: AbortSignal,
): Promise<AnalysisDetail> {
  try {
    const { data } = await apiClient.get<AnalysisDetail>(
      `/api/history/${encodeURIComponent(id)}`,
      { signal },
    );
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
