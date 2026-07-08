"use client";

import { motion } from "framer-motion";

export default function AppShell() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 safe-top">
      <div className="mx-4 mt-3">
        <div className="glass-panel flex items-center justify-between px-5 py-3">
          {/* Logo mark */}
          <div className="flex items-center gap-3">
            <span className="font-display text-xl tracking-tight text-gameon-yellow leading-none">
              GO
            </span>
          </div>

          {/* Gurugram pill */}
          <div className="flex items-center gap-2 border border-gameon-yellow-dim/30 rounded-full px-3.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gameon-yellow animate-pulse" />
            <span className="text-xs font-medium tracking-wider text-gameon-yellow-dim uppercase">
              Gurugram · 2026
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}