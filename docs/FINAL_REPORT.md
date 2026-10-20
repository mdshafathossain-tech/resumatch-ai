# ResuMatch AI: Final Capstone Report

**Intelligent Resume-JD Gap Analysis & Career Coaching System**

| | |
|---|---|
| **Student** | Md. Shafat Hossain |
| **Mentor** | Sazzad |
| **Course component** | Module 27: AI Capstone Project |
| **Date** | October 2026 |
| **Live application** | `<your-vercel-url>` |
| **API** | `<your-render-url>` |
| **Repository** | `<your-github-repo-url>` |

---

## Abstract

ResuMatch AI helps job seekers understand how well a resume fits a specific job description (JD) and how to improve it. A user uploads a PDF resume and pastes a JD; the system returns an overall match score with hard-skill and soft-skill sub-scores, missing keywords, prioritized skill gaps, and AI-rewritten bullet points. Results are stored and visualized as a score trend. The system is a Next.js 14 frontend, a FastAPI backend, a Supabase PostgreSQL database secured with Row Level Security, and a Google Gemini analysis layer built on the `google-genai` SDK with a three-model fallback chain. This report documents the problem, architecture, AI workflow, scoring methodology, security posture, challenges, and future work.

---

## 1. Introduction and Background

### 1.1 Problem

Employers increasingly screen applications with Applicant Tracking Systems (ATS) that depend heavily on keyword matching. This produces three problems for candidates:

1. **Opaque rejection.** A strong candidate can be filtered out for wording differences (for example "dashboarding" versus "data visualization") without ever learning why.
2. **Unknown fit.** Candidates reuse one resume across many roles and cannot see which required skills are under-represented.
3. **Generic advice.** Free tools offer checklists; personalized, role-specific bullet rewriting is usually paywalled.

### 1.2 Objectives

| ID | Objective | Status |
|---|---|---|
| O1 | Calibrated 0-100 overall, hard-skill, and soft-skill scores | Delivered |
| O2 | Missing keywords and prioritized skill gaps | Delivered |
| O3 | Role-aligned rewrites without fabricated facts, with `[X%]` metric placeholders | Delivered |
| O4 | Persistent history and score-trend dashboard | Delivered |
| O5 | Reliability under free-tier AI quotas (retry and model fallback) | Delivered |
| O6 | Public deployment, documentation, clean repository | Delivered |

### 1.3 Scope

**In scope:** text-based PDF resumes up to 5 MB, English JDs of 50-10,000 characters, analysis, rewrites, history, deployment.
**Out of scope:** user authentication, OCR for scanned resumes, multilingual support, job-board integrations.

---

## 2. System Architecture and Design Decisions

![Architecture](images/architecture.png)

### 2.1 Components

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide, Recharts, Framer Motion, Axios | Upload form, loading experience, report rendering, history dashboard |
| Backend | FastAPI, Uvicorn, Pydantic v2, PyPDF2 | Validation, PDF extraction, AI orchestration, persistence, REST API |
| AI | Google Gemini via `google-genai` | Structured resume-JD analysis |
| Database | Supabase PostgreSQL (JSONB, RLS) | Durable analysis history |
| Hosting | Vercel and Render | Frontend delivery and API hosting |

### 2.2 Backend design

The backend follows a layered structure: **routers** (HTTP concerns and error mapping), **services** (PDF and AI logic with no HTTP knowledge), **schemas** (Pydantic contracts), and **config/database** (environment and client setup). Key properties:

- **Fail-fast configuration.** Missing environment variables stop the app at startup with a clear message.
- **Non-blocking I/O.** The synchronous PDF and Gemini calls and the Supabase client calls run in a thread pool so the event loop stays responsive.
- **Typed contracts.** `AnalysisResponse`, `AnalysisDetail`, and `HistoryItem` models validate every response; the frontend mirrors them in TypeScript.
- **Predictable errors.** Every failure maps to a specific HTTP status and a safe, human-readable `detail` string.

### 2.3 Frontend design

- Two routes: `/` (analyze) and `/history` (dashboard). A shared `AnalysisReport` component renders results in both places, and a slide-over drawer shows past reports without leaving the history page.
- **Responsive and accessible:** mobile-first Tailwind layouts, keyboard-operable dropzone, ARIA labels on gauges and dialogs, `prefers-reduced-motion` support, color-coded scores that also carry text labels.
- **Client-side validation mirrors the server** (PDF only, 5 MB, 50-10,000 JD characters) for instant feedback, while the server remains the authority.
- **Resilient UX:** a 120-second request timeout, staged progress UI, an explanation if processing is slow, and `AbortController` cancellation.

### 2.4 Key design decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Single structured LLM call for scoring | Embedding cosine similarity; multi-step chains | One call yields scores, gaps, and rewrites together with consistent reasoning, lower latency, and less quota use. Embeddings alone cannot explain *why* a score is low or produce rewrites. |
| Supabase with RLS and a server-held `service_role` key | Client-side Supabase access | The browser never touches the database, so the attack surface is the validated API only. |
| Separate Vercel and Render deployments | Single host | Independent scaling and free-tier fit; clear separation between UI and API. |
| JSONB columns for lists | Normalized child tables | The lists are always read and written as a unit; JSONB keeps the schema simple. |
| Do not store raw resume text | Store full text | Data minimization: privacy and storage benefits, since only the analysis and the JD are needed for history. |

> **Note on a design change.** The initial proposal described embedding-based cosine similarity for the match score. During implementation the scoring was consolidated into a rubric-driven LLM analysis (section 3) because it provides explainable sub-scores and rewrites in one call. The `vector` extension is enabled in the database so a hybrid embedding signal can be added later.

---

## 3. AI Implementation and Workflow Rationale

A complete treatment is in [AI_METHODOLOGY.md](AI_METHODOLOGY.md). The essentials follow.

### 3.1 Workflow

1. **Validate and extract.** Check the file (extension, content type, size, `%PDF-` signature), extract text with PyPDF2, normalize it (Unicode NFKC, de-hyphenation, whitespace cleanup), and reject unreadable or scanned files.
2. **Build the prompt.** Wrap the resume and JD in `<resume>` and `<job_description>` tags after stripping any user-supplied copies of those tags; cap lengths at 15,000 and 8,000 characters.
3. **Call Gemini** with a system instruction, `temperature=0.2`, and JSON response mode.
4. **Parse defensively.** Strip code fences, salvage the outermost JSON object, normalize values, and validate with Pydantic.
5. **Persist and respond.** Store the result in Supabase and return the stored record.

### 3.2 Why this prompt design

| Technique | Rationale |
|---|---|
| System instruction with an explicit rubric | Makes scoring consistent and auditable. |
| XML tag isolation and a "treat as data" rule | Reduces prompt-injection risk from untrusted resume or JD text. |
| Verbatim `original` bullets | Grounds rewrites in real resume content and prevents invented experience. |
| `[X%]` placeholders | Prompts users to add real, verifiable metrics instead of fabricated ones. This is the system's most distinctive behavior. |
| JSON mode and a fixed schema | Gives the UI predictable data. |

### 3.3 Multi-model fallback

The service rotates through `gemini-3.8-flash`, then `gemini-3.6-flash`, then `gemini-3.5-flash-lite` (and back to the primary on the fourth attempt), with these rules:

| Outcome | Action |
|---|---|
| 429 | Next model after `2.0 s x attempt` plus jitter |
| 500 / 503 / 504 | Next model after `1.5 s x attempt` plus jitter |
| 403 / 404 | Next model immediately |
| Invalid JSON or schema failure | Retry after about 1 s |
| Other 4xx | Fail fast |

Rotating models matters because overload and quota limits are often per model: each retry gets a fresh chance, and the user rarely sees an error.

---

## 4. Key Results, Calibration, and Scoring Methodology

### 4.1 Score definitions

| Score | Definition |
|---|---|
| **Hard skills (0-100)** | Coverage of technical skills, tools, technologies, certifications, and domain knowledge the JD requires. |
| **Soft skills (0-100)** | Evidence of communication, leadership, teamwork, problem-solving, and other soft skills the JD asks for. |
| **Overall match (0-100)** | Weighted blend: about **60% hard skills, 25% experience and role relevance, 15% soft skills**. |

**Interpretation bands** (used consistently by the model prompt and the UI colors):

| Range | Label | Color |
|---|---|---|
| 75-100 | Strong match | Green |
| 50-74 | Partial match | Yellow |
| 0-49 | Weak match | Red |

### 4.2 Calibration approach

- The prompt instructs the model to be realistic and never inflate: 90+ is reserved for near-perfect matches, and below 40 for weak ones.
- `temperature=0.2` reduces run-to-run variance.
- Scores are coerced to integers and clamped to 0-100 after parsing, so a malformed value cannot reach the UI.
- Lists are capped (15 keywords, 10 gaps, 5 rewrites) to keep output focused.

Scores are model-judged estimates, not statistically validated measurements. The recommended validation protocol and results table are below.

### 4.3 Functional results

| Capability | Result |
|---|---|
| End-to-end flow (upload, analysis, persistence, response) | Verified with HTTP 200 responses |
| History list, detail view, and trend chart | Verified end to end |
| Input validation (wrong type, empty file, oversize, invalid PDF, short JD) | Returns the documented 4xx errors |
| Provider overload (observed HTTP 503 during testing) | Mitigated by the retry and model-fallback layer |
| Resilience logic (503 to fallback, 404 skip, repeated 429, fenced JSON, 400 fail-fast) | Verified with a simulated provider |
| Frontend build and type-check | Passing |

### 4.4 Validation protocol and measurements (complete before submission)

> Fill the bracketed cells from your own deployed tests. Do not submit placeholders.

| Test | Method | Result |
|---|---|---|
| Matched vs. mismatched | Run `[N]` resume-JD pairs that should match and `[N]` that should not; compare average overall scores | Matched avg `[__]`, mismatched avg `[__]` |
| Repeatability | Run the same pair `[5]` times | Overall score range `[__ - __]` |
| Latency | Time `[N]` analyses end to end | Median `[__] s`, max `[__] s` |
| Schema validity | Count first-attempt valid responses out of `[N]` | `[__]%` first attempt, `[__]%` after retries |
| Sample case | Resume: `[describe]`; JD: Data Analyst (Python, SQL, Tableau, ML) | Overall `[__]`, hard `[__]`, soft `[__]` |

---

## 5. Security, Data Persistence, and Performance

### 5.1 Security controls

| Area | Control |
|---|---|
| Uploads | Extension, content type, size (5 MB), and `%PDF-` signature checks; empty, encrypted, or unreadable PDFs rejected. |
| Prompt injection | Role separation, XML boundary tags, tag stripping, strict output validation, length caps, and a model with no tools or network access. |
| Secrets | `service_role` and Gemini keys exist only in backend environment variables; `.env` files are git-ignored. |
| Database | RLS enabled on all tables with no `anon` or `authenticated` policies (deny by default), plus `REVOKE ALL` for public roles; only the backend can read or write. |
| Input handling | UUID-typed path parameters, bounded pagination, parameterized queries through the Supabase client. |
| Error hygiene | Raw provider errors and stack traces stay in server logs; clients receive safe messages. |
| Privacy | Raw resume text is never stored. |

### 5.2 Data persistence

The `analysis_history` table stores the filename, title, JD, three scores, and three JSONB arrays (`missing_keywords`, `skill_gaps`, `rewritten_bullets`). `CHECK` constraints enforce 0-100 scores; defaults ensure arrays are never null; indexes on `created_at DESC` and `user_id` support the history queries and future per-user filtering.

### 5.3 Performance optimizations

- Thread-pool offloading keeps the API responsive during long AI calls.
- History list queries select only the columns they need and are paginated (`limit` 1-100).
- A cached Supabase client avoids repeated connection setup.
- Input size caps and a single LLM call bound latency and quota use.
- Frontend: static page generation, code splitting by route, request cancellation, and a progress UI that makes the wait understandable.

---

## 6. Challenges Overcome and Lessons Learned

| Challenge | Resolution | Lesson |
|---|---|---|
| Gemini returned 503/429 under load | Added retries with backoff and a three-model rotation; made errors distinguishable in logs and UI messages | Treat the AI provider as an unreliable dependency; design for degraded modes. |
| Model names change or become restricted over time | Models and fallbacks configurable through environment variables | Never hard-wire model identifiers. |
| SDK migration from `google-generativeai` to `google-genai` | Rewrote the client, error handling (`APIError.code`), and config objects | Track SDK deprecations early. |
| LLM output not always clean JSON | Four-layer enforcement: prompt, JSON mode, repair parser, Pydantic | Never trust model output; validate at the boundary. |
| Blocking SDK inside an async framework | Offloaded blocking calls with `run_in_threadpool` | Async frameworks require care with sync libraries. |
| Securing the database with RLS | Switched the backend to the `service_role` key and made policies deny by default | A leaked public key must not equal data access. |
| Scanned PDFs yield no text | Minimum-text check with a clear, actionable error | Fail early with guidance, not a vague AI error. |
| CORS with wildcard origin | Disabled credentials (required with `*`) and documented tightening for production | Defaults that work in development need production hardening. |
| Clipboard API requires a secure context | Added a legacy fallback with visible success and failure states | Handle browser capability differences explicitly. |

**General lessons:** structure beats cleverness (small, typed, testable modules); document failure modes alongside features; verify resilience with simulated failures rather than waiting for real outages.

---

## 7. Real-World Impact, Novelty, and Future Enhancements

### 7.1 Impact

- **Accessibility:** ATS-style feedback and role-specific coaching at no cost, especially valuable for fresh graduates and career switchers.
- **Actionability:** every output maps to a concrete edit: add this keyword, close this gap, rewrite this bullet.
- **Measurable progress:** the history dashboard shows whether each resume revision improved the match.

### 7.2 Novelty

- **Metric placeholders (`[X%]`).** Instead of fabricating achievements, the coach marks exactly where a real number would raise impact, and the UI highlights these spots. This encourages honest, quantified resumes.
- **Explainable decomposition** into hard skills, soft skills, and overall fit, rather than a single opaque score.
- **Production-grade AI resilience** (model rotation, backoff with jitter, repair parser) applied to a student project.

### 7.3 Limitations

| Limitation | Detail |
|---|---|
| No authentication | History is shared per deployment; avoid sensitive resumes on the public instance. |
| Model-judged scores | Not yet validated on a labeled dataset. |
| No inbound rate limiting | Only upstream retry handling exists. |
| Text-based PDFs only | Scanned resumes need OCR. |
| English only | |
| Open CORS by default | Must be restricted to the production origin. |

### 7.4 Future enhancements

| Priority | Enhancement |
|---|---|
| High | Supabase Auth with per-user history and owner-only RLS policies |
| High | Inbound rate limiting and CORS restriction |
| High | Labeled evaluation set and calibration study |
| Medium | Hybrid scoring: embedding cosine similarity (pgvector) blended with the LLM rubric |
| Medium | Caching by hash of (resume, JD); native response-schema constraints |
| Medium | Export of the improved resume and report (PDF/DOCX) |
| Low | OCR for scanned PDFs, multilingual support, job-board import, streaming responses |

---

## 8. Conclusion

ResuMatch AI delivers a complete, deployed AI product: a responsive Next.js interface, a validated FastAPI service, a secured Supabase database, and a resilient Gemini analysis layer. Its main contributions are an explainable score decomposition, honest rewrite coaching with metric placeholders, and engineering practices that keep an LLM-backed service dependable on free-tier infrastructure: layered output validation, injection-aware prompts, and model fallback with backoff. The remaining work, chiefly authentication, quantitative validation, and hybrid scoring, is clearly scoped and builds directly on the current architecture.

---

## Appendix A: Evaluation Criteria Mapping

| Criterion (marks) | Where it is addressed |
|---|---|
| Problem Definition (10) | Sections 1.1-1.3; [PROJECT_PROPOSAL.md](PROJECT_PROPOSAL.md) |
| Frontend (10) | Section 2.3; Next.js 14, Tailwind, Lucide, Recharts, responsive and accessible UI |
| Backend (15) | Sections 2.2, 5; FastAPI REST API, Supabase with RLS, error handling |
| AI Integration (25) | Section 3; [AI_METHODOLOGY.md](AI_METHODOLOGY.md): `google-genai`, model chain, XML isolation, JSON parsing, retries |
| Deployment (10) | README, Deployment section: Vercel and Render |
| Git/GitHub and documentation (10) | README.md and repository structure |
| Final Report (15) | This document |
| Innovation and Impact (5) | Section 7: ATS optimization and `[X%]` metric placeholders |

## Appendix B: References

1. Google AI for Developers, Gemini API documentation: https://ai.google.dev/gemini-api/docs
2. FastAPI documentation: https://fastapi.tiangolo.com
3. Next.js documentation: https://nextjs.org/docs
4. Supabase, Row Level Security guide: https://supabase.com/docs/guides/database/postgres/row-level-security
5. Recharts documentation: https://recharts.org
6. Pydantic documentation: https://docs.pydantic.dev
