"use client";

import ScoreboardCountdown from "./ScoreboardCountdown";

export default function Hero() {
  return (
    <section className="scroll-section relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-32 overflow-hidden">
      {/* Court-line grid background */}
      <div className="absolute inset-0 court-line-bg" />

      {/* Floodlight glow */}
      <div className="floodlight-glow top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto gap-8">
        {/* Kicker */}
        <span className="text-xs md:text-sm tracking-[0.2em] uppercase text-gameon-yellow-dim font-medium">
          India's Premium Sports Destination
        </span>

        {/* Wordmark */}
        <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none text-gameon-off-white">
          GAME ON
        </h1>

        {/* Subhead */}
        <p className="text-sm md:text-base text-gameon-off-white/60 font-medium tracking-wide max-w-xs">
          Play. Perform. Belong. Grow. One address. Every sport.
        </p>

        {/* Scoreboard Countdown */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gameon-yellow-dim mb-4 text-center">
            Opening In
          </div>
          <ScoreboardCountdown />
        </div>
      </div>
    </section>
  );
}