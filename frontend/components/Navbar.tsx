"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Analyze", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
] as const;

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-navy text-white">
            <Target className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight text-brand-navy">
            ResuMatch <span className="text-brand-teal">AI</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-brand-mint text-brand-navy"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
