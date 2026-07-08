"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [phase, setPhase] = useState<"intro" | "logo" | "wipe" | "done">("intro");

  useEffect(() => {
    // Check if already played this session
    if (typeof window !== "undefined") {
      const played = sessionStorage.getItem("gameon-splash-played");
      if (played) {
        setPhase("done");
        onComplete();
        return;
      }
    }

    // Check reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setPhase("done");
      onComplete();
      return;
    }

    // Phase sequence
    setPhase("logo");

    const t1 = setTimeout(() => setPhase("wipe"), 1100);
    const t2 = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("gameon-splash-played", "true");
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gameon-black safe-top safe-bottom"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          {/* Logo phase */}
          {phase === "logo" && (
            <motion.h1
              className="font-display text-7xl md:text-8xl tracking-tight text-gameon-off-white"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                animate={{
                  opacity: [0.4, 1, 0.3, 1],
                }}
                transition={{
                  duration: 0.5,
                  times: [0, 0.2, 0.4, 0.7],
                  ease: "easeInOut",
                }}
                style={{ textShadow: "0 0 40px rgba(245,208,0,0.3)" }}
              >
                GAME ON
              </motion.span>
            </motion.h1>
          )}

          {/* Wipe up phase */}
          {phase === "wipe" && (
            <motion.div
              className="absolute inset-0 bg-gameon-black flex items-center justify-center"
              initial={{ y: 0 }}
              animate={{ y: "-100%" }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <motion.h1
                className="font-display text-7xl md:text-8xl tracking-tight text-gameon-off-white"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                GAME ON
              </motion.h1>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}