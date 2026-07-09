"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Briefcase, Heart, Trophy, Swords, Building2 } from "lucide-react";

interface Audience {
  id: string;
  label: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  color: string;
  bg: string;
}

const audiences: Audience[] = [
  {
    id: "corporate",
    label: "Corporate Professionals",
    icon: <Briefcase className="w-6 h-6" />,
    tagline: "After-work bookings & team leagues that don't feel like work.",
    description: "Short on time but big on ambition. Book a late-evening slot, join a corporate league, or bring the team for a tournament that actually builds camaraderie. Located right off the Golf Course Extension Road — 10 minutes from DLF Phase 2.",
    color: "#F5D000",
    bg: "from-[#F5D000]/20 via-transparent to-transparent",
  },
  {
    id: "families",
    label: "Families & Women",
    icon: <Heart className="w-6 h-6" />,
    tagline: "Safe, clean, welcoming — for every age and skill level.",
    description: "Well-lit premises, dedicated women-only coaching hours, clean changing rooms, and a café where families can relax while kids train. Weekday mornings and weekend slots designed for family play.",
    color: "#F5D000",
    bg: "from-[#F5D000]/20 via-transparent to-transparent",
  },
  {
    id: "athletes",
    label: "Competitive Athletes",
    icon: <Trophy className="w-6 h-6" />,
    tagline: "Pro-grade surfaces where champions train.",
    description: "Used by Shikhar Dhawan and Ishant Sharma for IPL prep. Synthetic wood badminton flooring, pro pickleball surfaces, Ranji-level cricket nets. If you're serious, this is where you train.",
    color: "#F5D000",
    bg: "from-[#F5D000]/15 via-transparent to-transparent",
  },
  {
    id: "pickleball",
    label: "Pickleball Community",
    icon: <Swords className="w-6 h-6" />,
    tagline: "A dedicated home for India's fastest-growing sport.",
    description: "4 dedicated courts (2 indoor AC, 2 outdoor), pro-grade surfaces, and a World Champion as our strategy partner — Neha Chhabra (2025 Gold). Leagues, coaching, and open play every week.",
    color: "#F5D000",
    bg: "from-[#F5D000]/20 via-transparent to-transparent",
  },
  {
    id: "cricket",
    label: "Cricket Practice Crowd",
    icon: <Building2 className="w-6 h-6" />,
    tagline: "6 nets, 4 outdoor + 2 indoor. No more waiting.",
    description: "Bowling machines, matting and turf options, indoor nets for monsoon months, outdoor floodlit nets for evening practice. From school kids to Ranji prospects — every level, every format.",
    color: "#2B3A4A",
    bg: "from-[#2B3A4A]/30 via-transparent to-transparent",
  },
];

export function AudienceSection() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const current = audiences[active];

  return (
    <section id="audience" ref={ref} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28 overflow-hidden">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Built For You</span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          Who Are You Playing For?
        </h2>
      </motion.div>

      {/* Swipeable cards */}
      <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x-mandatory pb-4 -mx-6 sm:-mx-8 lg:mx-0 px-6 sm:px-8 lg:px-0">
        {audiences.map((audience, i) => (
          <motion.button
            key={audience.id}
            onClick={() => setActive(i)}
            className={`relative min-w-[280px] lg:min-w-[320px] snap-start rounded-[28px] p-6 lg:p-8 text-left cursor-pointer transition-all shrink-0 ${
              i === active
                ? "glass"
                : "glass-subtle opacity-60 hover:opacity-80"
            }`}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {i === active && (
              <div
                className="absolute inset-0 rounded-[28px] opacity-10"
                style={{
                  background: `linear-gradient(135deg, ${current.color} 0%, transparent 60%)`,
                }}
              />
            )}
            <div className="relative z-10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${audience.color}20` }}
              >
                <div style={{ color: audience.color }}>{audience.icon}</div>
              </div>
              <h3 className="text-lg font-display font-bold text-go-white mb-2">{audience.label}</h3>
              <p className="text-sm text-go-off/70 leading-relaxed">{audience.tagline}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Active detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-6 glass-subtle rounded-[28px] p-6 lg:p-8 lg:max-w-2xl"
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${current.color}20` }}
            >
              <div style={{ color: current.color }}>{current.icon}</div>
            </div>
            <div>
              <h4 className="font-display text-lg text-go-white mb-2">{current.tagline}</h4>
              <p className="text-sm text-go-off/60 leading-relaxed">{current.description}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}