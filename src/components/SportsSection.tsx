"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  BadgePlus,
  Swords,
  Goal,
  Table,
  X,
  Clock,
  DollarSign,
  Thermometer,
  Users,
  Calendar,
  ChevronDown,
  MapPin,
  Star,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Each sport gets its own unique identity ───
const sports = [
  {
    id: "pickleball",
    title: "Pickleball",
    subtitle: "Fastest Growing Sport",
    description: "4 premium indoor AC courts with professional-grade equipment",
    courts: 4,
    ac: true,
    pricing: "₹800/hr",
    icon: <BadgePlus className="w-5 h-5 text-white" />,
    emoji: "🏓",
    gradient: "linear-gradient(145deg, #1A1A2E 0%, #16213E 40%, #0F3460 100%)",
    accentColor: "#F5D000",
    features: ["Indoor AC", "Pro Coaching", "Equipment Provided"],
    highlights: ["4 Dedicated Courts", "Tournament Ready", "Beginner Friendly"],
    stat: "Fastest Growing Sport in India",
  },
  {
    id: "badminton",
    title: "Badminton",
    subtitle: "Premium Courts",
    description: "5 synthetic courts — 2 air-conditioned, 3 floodlit for night play",
    courts: 5,
    ac: true,
    pricing: "₹600/hr",
    icon: <Swords className="w-5 h-5 text-white" />,
    emoji: "🏸",
    gradient: "linear-gradient(145deg, #1B1B2F 0%, #1A1A3E 40%, #2D1B69 100%)",
    accentColor: "#A855F7",
    features: ["Synthetic Flooring", "Tournament Grade", "Floodlit"],
    highlights: ["2 AC + 3 Non-AC", "Professional Lighting", "Coaching Available"],
    stat: "5 Courts • Most in Sector 70",
  },
  {
    id: "box-cricket",
    title: "Box Cricket",
    subtitle: "Turf Arena",
    description: "100×60 ft astroturf arena with floodlights and digital scoreboard",
    courts: 1,
    ac: false,
    pricing: "₹2,500/hr",
    icon: <Goal className="w-5 h-5 text-white" />,
    emoji: "🏏",
    gradient: "linear-gradient(145deg, #0F2027 0%, #203A43 40%, #2C5364 100%)",
    accentColor: "#34D399",
    features: ["Astro Turf", "Floodlit", "Scoreboard"],
    highlights: ["100×60 ft Arena", "Night Cricket", "Team Events"],
    stat: "Full-size Box Cricket Experience",
  },
  {
    id: "cricket-nets",
    title: "Cricket Nets",
    subtitle: "6 Nets Total",
    description: "2 indoor + 4 outdoor nets with bowling machines & expert coaching",
    courts: 6,
    ac: false,
    pricing: "₹400/hr",
    icon: <Table className="w-5 h-5 text-white" />,
    emoji: "🎯",
    gradient: "linear-gradient(145deg, #1A1A2E 0%, #16213E 40%, #0F3460 100%)",
    accentColor: "#F59E0B",
    features: ["Bowling Machine", "Net Practice", "Coaching"],
    highlights: ["2 Indoor + 4 Outdoor", "Bowling Machines", "All Formats"],
    stat: "Practice Like a Pro",
  },
];

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };
const springSnap = { type: "spring" as const, stiffness: 400, damping: 30 };

interface SportsSectionProps {
  onReserve?: () => void;
}

// ─── Individual Sport Card ───
function SportCard({
  sport,
  index,
  inView,
  onReserve,
}: {
  sport: (typeof sports)[0];
  index: number;
  inView: boolean;
  onReserve?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setExpanded(true)}
        initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{
          duration: 0.6,
          delay: 0.1 + index * 0.12,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="group relative rounded-[28px] overflow-hidden text-left cursor-pointer w-full border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500"
        style={{ background: sport.gradient }}
      >
        {/* ─── Animated Background Effects ─── */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient sweep on hover */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: `linear-gradient(135deg, ${sport.accentColor}25 0%, transparent 60%)`,
            }}
          />

          {/* Radial glow spots */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                radial-gradient(circle at 15% 30%, ${sport.accentColor} 0%, transparent 50%),
                radial-gradient(circle at 85% 70%, ${sport.accentColor} 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, ${sport.accentColor} 0%, transparent 60%)
              `,
            }}
          />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(${sport.accentColor} 1px, transparent 1px), linear-gradient(90deg, ${sport.accentColor} 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />

          {/* Floating emoji */}
          <motion.span
            className="absolute pointer-events-none select-none text-9xl -top-6 -right-6 opacity-[0.06]"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            {sport.emoji}
          </motion.span>
        </div>

        {/* ─── Content ─── */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col min-h-[320px] sm:min-h-[360px] lg:min-h-[400px]">
          {/* Top Row: Icon + Badge */}
          <div className="flex items-start justify-between mb-auto">
            <motion.div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, ${sport.accentColor}30 0%, ${sport.accentColor}10 100%)`,
                border: `1px solid ${sport.accentColor}20`,
              }}
              whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.3 }}
            >
              <div className="scale-110 sm:scale-125">{sport.icon}</div>
            </motion.div>

            <motion.div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/[0.08]"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Star className="w-3 h-3" style={{ color: sport.accentColor }} />
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/60">
                {sport.subtitle}
              </span>
            </motion.div>
          </div>

          {/* Middle: Title + Description */}
          <div className="mt-6 sm:mt-8">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white leading-tight">
              {sport.title}
            </h3>
            <p className="text-sm sm:text-base text-white/40 mt-2 max-w-sm leading-relaxed">
              {sport.description}
            </p>
          </div>

          {/* Bottom: Stats Row */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: sport.accentColor }}
              />
              <span className="text-xs sm:text-sm text-white/60 font-medium">
                {sport.courts} {sport.courts === 1 ? "Court" : "Courts"}
              </span>
            </div>
            {sport.ac && (
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs sm:text-sm text-white/60 font-medium">AC</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs sm:text-sm text-white/60 font-medium">{sport.pricing}</span>
            </div>
          </div>

          {/* Feature Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {sport.features.map((feature) => (
              <span
                key={feature}
                className="px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider bg-white/5 text-white/40 border border-white/[0.06]"
              >
                {feature}
              </span>
            ))}
          </div>

          {/* Bottom accent glow */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
            style={{
              background: `linear-gradient(90deg, transparent, ${sport.accentColor}, transparent)`,
            }}
          />
        </div>

        {/* ─── Expand Indicator ─── */}
        <div className="absolute bottom-5 right-5 z-20">
          <motion.div
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{
              background: `${sport.accentColor}20`,
              border: `1px solid ${sport.accentColor}25`,
            }}
            whileHover={{ scale: 1.15 }}
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4" style={{ color: sport.accentColor }} />
          </motion.div>
        </div>
      </motion.button>

      {/* ─── Expanded Overlay ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={spring}
              className="relative w-full max-w-lg rounded-[32px] overflow-hidden"
              style={{ background: sport.gradient }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative bg */}
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage: `radial-gradient(circle at 25% 35%, ${sport.accentColor} 0%, transparent 50%), radial-gradient(circle at 75% 65%, ${sport.accentColor} 0%, transparent 40%)`,
                }}
              />

              <div className="relative z-10 p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                      style={{
                        background: `linear-gradient(135deg, ${sport.accentColor}35 0%, ${sport.accentColor}10 100%)`,
                        border: `1px solid ${sport.accentColor}25`,
                      }}
                      whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                    >
                      {sport.emoji}
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-display font-bold text-white">{sport.title}</h3>
                      <p className="text-sm text-white/50 mt-0.5">{sport.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: Users, label: "Capacity", value: `${sport.courts} Courts` },
                    { icon: Clock, label: "Timing", value: "6AM – 11PM" },
                    { icon: DollarSign, label: "Starting From", value: sport.pricing },
                    { icon: Thermometer, label: "Climate", value: sport.ac ? "AC" : "Natural" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl p-4 backdrop-blur-sm"
                      style={{
                        background: `${sport.accentColor}12`,
                        border: `1px solid ${sport.accentColor}15`,
                      }}
                    >
                      <stat.icon className="w-4 h-4 mb-2" style={{ color: sport.accentColor }} />
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
                        {stat.label}
                      </p>
                      <p className="text-base font-bold text-white mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Highlights */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" style={{ color: sport.accentColor }} />
                    Highlights
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sport.highlights.map((h) => (
                      <span
                        key={h}
                        className="px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm"
                        style={{
                          background: `${sport.accentColor}15`,
                          border: `1px solid ${sport.accentColor}20`,
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <motion.button
                  onClick={() => {
                    setExpanded(false);
                    onReserve?.();
                  }}
                  className="w-full rounded-2xl py-4 font-semibold text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${sport.accentColor}, ${sport.accentColor}cc)`,
                    color: "#fff",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springSnap}
                >
                  <Calendar className="w-4 h-4" />
                  Reserve a Slot
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Section ───
export function SportsSection({ onReserve }: SportsSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="sports"
      ref={ref}
      className="relative px-5 sm:px-8 lg:px-14 xl:px-20 py-16 lg:py-28"
    >
      {/* ─── Section Header ─── */}
      <motion.div
        className="mb-12 lg:mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-10 bg-go-brand/50" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-go-brand font-semibold">
            Pick Your Game
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-white leading-[1.1]">
              One Address.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-go-brand via-go-brand to-go-brand/60">
                Every Sport.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-white/40 mt-4 max-w-xl leading-relaxed">
              From air-conditioned pickleball to floodlit cricket nets — 1.5 acres
              purpose-built for every kind of player, from beginner to pro.
            </p>
          </div>

          {/* Desktop CTA */}
          <motion.button
            onClick={onReserve}
            className="hidden lg:inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 text-sm font-medium shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="w-2 h-2 rounded-full bg-go-brand animate-pulse" />
            View All Sports &amp; Pricing
            <motion.span
              className="inline-block"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              →
            </motion.span>
          </motion.button>
        </div>
      </motion.div>

      {/* ─── Sports Grid: 2×2 on desktop, 1-col on mobile ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
        {sports.map((sport, i) => (
          <SportCard
            key={sport.id}
            sport={sport}
            index={i}
            inView={inView}
            onReserve={onReserve}
          />
        ))}
      </div>

      {/* ─── Mobile Bottom CTA ─── */}
      <motion.div
        className="mt-10 flex lg:hidden justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <button
          onClick={onReserve}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 text-sm font-medium"
        >
          <span className="w-2 h-2 rounded-full bg-go-brand animate-pulse" />
          View All Sports &amp; Pricing
          <motion.span
            className="inline-block"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            →
          </motion.span>
        </button>
      </motion.div>
    </section>
  );
}