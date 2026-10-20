import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ResuMatch AI",
  description:
    "Intelligent Resume-JD gap analysis and career coaching powered by semantic AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-teal-50 to-transparent"
        />
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          ResuMatch AI &middot; AI Capstone Project
        </footer>
      </body>
    </html>
  );
}
