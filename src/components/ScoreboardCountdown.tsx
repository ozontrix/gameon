"use client";

import { useState, useEffect } from "react";

// TODO Chander: replace with confirmed launch date
export const LAUNCH_DATE = new Date("2026-10-01T00:00:00+05:30");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function pad(num: number): string {
  return String(num).padStart(2, "0");
}

export default function ScoreboardCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function calc() {
      const now = new Date();
      const diff = LAUNCH_DATE.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return { days, hours, minutes, seconds };
    }

    setTimeLeft(calc());
    const interval = setInterval(() => {
      setTimeLeft(calc());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center gap-4 md:gap-6">
        {["days", "hours", "minutes", "seconds"].map((unit) => (
          <div key={unit} className="flex flex-col items-center gap-1">
            <div className="glass-panel w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
              <span className="flip-digit text-2xl md:text-3xl text-gameon-yellow">
                00
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-gameon-yellow-dim">
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Days", value: pad(timeLeft.days) },
    { label: "Hours", value: pad(timeLeft.hours) },
    { label: "Minutes", value: pad(timeLeft.minutes) },
    { label: "Seconds", value: pad(timeLeft.seconds) },
  ];

  return (
    <div className="flex items-center justify-center gap-4 md:gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-1">
          <div className="glass-panel w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
            <span className="flip-digit text-2xl md:text-3xl text-gameon-yellow">
              {item.value}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-gameon-yellow-dim">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}