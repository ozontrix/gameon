import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageShellProps {
  title: string;
  updated: string;
  children: ReactNode;
}

// Shared shell for formal legal pages (Terms of Use, Privacy Policy, etc.)
export function LegalPageShell({ title, updated, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-go-black text-go-off">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[rgba(14,17,22,0.92)] backdrop-blur-[20px] saturate-[160%]">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="Game On — go to home">
            <span className="text-lg font-display font-bold tracking-tight text-go-white group-hover:text-go-off transition-colors">
              GAME<span className="text-go-brand">ON</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-go-off/60 hover:text-go-brand transition-colors"
          >
            <span aria-hidden>←</span> Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-6 sm:px-8 py-12 lg:py-16">
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Legal</span>
        <h1 className="mt-2 text-3xl lg:text-4xl font-display font-bold text-go-white">{title}</h1>
        <p className="text-xs text-go-off/40 mt-3">Last updated: {updated}</p>

        <div className="mt-10 space-y-10">{children}</div>
      </article>

      {/* Footer */}
      <footer className="border-t border-go-border-subtle/50 bg-go-navy">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-go-off/40">
            © {new Date().getFullYear()} Game On Multisports Complex. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/terms" className="text-go-off/50 hover:text-go-brand transition-colors">
              Terms of Use
            </Link>
            <Link href="/privacy" className="text-go-off/50 hover:text-go-brand transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
