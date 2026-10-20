"use client";

import { motion } from "framer-motion";
import { Briefcase, Calendar, CheckCircle2, FileText, ListChecks, PenLine, Tag } from "lucide-react";
import ScoreGauge from "@/components/ScoreGauge";
import RewriteCard from "@/components/RewriteCard";
import type { AnalysisDetail } from "@/lib/api";
import { cn, formatDate, getScoreTone } from "@/lib/utils";

interface AnalysisReportProps {
  analysis: AnalysisDetail;
  className?: string;
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
  flush = false,
}: {
  icon: typeof Tag;
  title: string;
  hint?: string;
  /** Remove the bottom margin when the title is the only content of a card. */
  flush?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3", !flush && "mb-4")}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-mint text-brand-teal">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export default function AnalysisReport({ analysis, className }: AnalysisReportProps) {
  const tone = getScoreTone(analysis.overall_match_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("space-y-6", className)}
    >
      {/* Summary + gauges */}
      <section className="card">
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
            <Briefcase className="h-4 w-4 text-brand-teal" aria-hidden />
            {analysis.job_title}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" aria-hidden />
            {analysis.resume_filename}
          </span>
          {analysis.created_at && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden />
              {formatDate(analysis.created_at, "long")}
            </span>
          )}
        </div>

        <div className="flex flex-col items-center justify-around gap-8 md:flex-row">
          <ScoreGauge label="Overall Match" score={analysis.overall_match_score} size="lg" showVerdict />
          <div className="flex flex-wrap justify-center gap-8">
            <ScoreGauge label="Hard Skills" score={analysis.hard_skills_score} delay={0.15} />
            <ScoreGauge label="Soft Skills" score={analysis.soft_skills_score} delay={0.3} />
          </div>
        </div>

        <p className={cn("mt-6 rounded-xl border px-4 py-3 text-sm", tone.bg, tone.border, tone.text)}>
          <span className="font-semibold">{tone.label}.</span>{" "}
          {analysis.overall_match_score >= 75
            ? "Your resume aligns well with this role. Fine-tune the details below to stand out."
            : analysis.overall_match_score >= 50
              ? "You are on the right track. Closing the gaps below can raise your score noticeably."
              : "There is a significant gap. Focus on the missing keywords and skill gaps below."}
        </p>
      </section>

      {/* Missing keywords */}
      <section className="card">
        <SectionTitle
          icon={Tag}
          title="Missing Keywords"
          hint="Terms from the job description that do not appear in your resume."
        />
        {analysis.missing_keywords.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {analysis.missing_keywords.map((keyword) => (
              <li
                key={keyword}
                className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
              >
                {keyword}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            No important keywords are missing. Great coverage!
          </p>
        )}
      </section>

      {/* Skill gaps */}
      <section className="card">
        <SectionTitle
          icon={ListChecks}
          title="Skill Gaps"
          hint="Areas where the role expects more than your resume shows."
        />
        {analysis.skill_gaps.length > 0 ? (
          <ol className="space-y-3">
            {analysis.skill_gaps.map((gap, i) => (
              <li key={`${i}-${gap}`} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {i + 1}
                </span>
                <span className="pt-0.5">{gap}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            No significant skill gaps were found.
          </p>
        )}
      </section>

      {/* Rewrite coach */}
      <section>
        <div className="card mb-4">
          <SectionTitle
            icon={PenLine}
            title="AI Rewrite Coach"
            hint="Stronger, job-aligned versions of your existing bullets. Copy the ones you like."
            flush
          />
        </div>
        {analysis.rewritten_bullets.length > 0 ? (
          <div className="space-y-4">
            {analysis.rewritten_bullets.map((bullet, i) => (
              <RewriteCard
                key={`${i}-${bullet.original}`}
                index={i + 1}
                original={bullet.original}
                suggested={bullet.suggested}
              />
            ))}
          </div>
        ) : (
          <p className="card text-sm text-slate-500">No bullet rewrites were suggested for this resume.</p>
        )}
      </section>
    </motion.div>
  );
}
