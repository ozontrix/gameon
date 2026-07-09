"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { X, Trophy, Medal, MapPin, Quote, ChevronRight } from "lucide-react";

// ─── Person Data ───
interface LegacyPerson {
  name: string;
  sport: string;
  title: string;
  description: string;
  quote: string;
  gradient: string;
  emoji: string;
  imageSrc?: string; // ready for real images
}

const athletes: LegacyPerson[] = [
  {
    name: "Shikhar Dhawan",
    sport: "Cricket • India & DC",
    title: "Indian International Cricketer",
    description:
      "Trained at the facility ahead of the IPL season. A regular at Game On's premium cricket nets for match-preparation and sharpening his game.",
    quote: "Game On's nets gave me the perfect prep ground before the big season.",
    gradient: "from-[#F5A623] via-[#E8920E] to-[#D47900]",
    emoji: "🏏",
  },
  {
    name: "Ishant Sharma",
    sport: "Cricket • India & DC",
    title: "Indian International Cricketer",
    description:
      "Used Game On's indoor nets for intense match-preparation sessions during IPL 2025. Valued the bounce and consistency of the pitches.",
    quote: "The indoor nets here are among the best I've trained on in India.",
    gradient: "from-[#FF6B6B] via-[#EE5A24] to-[#D63031]",
    emoji: "🏏",
  },
  {
    name: "Ayush Badoni",
    sport: "Cricket • LSG",
    title: "IPL Cricketer",
    description:
      "Regular training at the facility. Credited Game On's nets for his pre-season prep and maintaining his form through the domestic circuit.",
    quote: "Game On is where I put in the work that shows on the field.",
    gradient: "from-[#6C5CE7] via-[#5F27CD] to-[#4834D4]",
    emoji: "🏏",
  },
  {
    name: "Neha Chhabra",
    sport: "Pickleball • World Champion",
    title: "World Championship Gold Medalist",
    description:
      "2025 World Championship Gold Medalist. Game On's Pickleball Strategy Partner and a driving force behind growing the sport in India.",
    quote: "Game On is building exactly what pickleball needs in India — world-class courts.",
    gradient: "from-[#00B894] via-[#00A381] to-[#008B6E]",
    emoji: "🏓",
  },
];

// ─── Gradient Avatar ───
function AvatarFallback({ name, gradient, emoji, size = "lg" }: {
  name: string;
  gradient: string;
  emoji: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "w-20 h-20 lg:w-24 lg:h-24" : "w-14 h-14 lg:w-16 lg:h-16";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center text-2xl lg:text-3xl font-bold shrink-0`}
      style={{
        background: `linear-gradient(135deg, ${gradient.replace("from-", "").replace("via-", "").replace("to-", "").trim()})`,
      }}
    >
      {emoji}
    </div>
  );
}

// ─── Bottom Sheet ───
function AthleteSheet({ person, onClose }: { person: LegacyPerson; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-lg rounded-t-[28px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image Area */}
        <div
          className="relative h-48 lg:h-56 flex flex-col justify-end p-6"
          style={{
            background: `linear-gradient(135deg, ${person.gradient.replace("from-", "").replace("via-", "").replace("to-", "").trim()})`,
          }}
        >
          {/* Decorative rings */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-4 right-4 text-5xl opacity-30">{person.emoji}</div>

          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="relative z-10">
            <h3 className="text-2xl lg:text-3xl font-display font-bold text-white drop-shadow-lg">
              {person.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Trophy className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs text-white/80 tracking-wide font-medium">{person.title}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#0E1116] p-6 pt-5">
          {/* Quote */}
          <div className="flex gap-2.5 mb-5">
            <Quote className="w-5 h-5 text-go-brand shrink-0 mt-0.5" />
            <p className="text-sm text-go-off/80 italic leading-relaxed">"{person.quote}"</p>
          </div>

          {/* Description */}
          <p className="text-sm text-go-off/60 leading-relaxed">{person.description}</p>

          {/* Bottom Meta */}
          <div className="mt-6 pt-4 border-t border-go-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-go-brand/60" />
              <span className="text-xs text-go-off/40">{person.sport}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-go-brand" />
              <span className="text-xs text-go-brand/70 font-medium">Game On Athlete</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Section ───
export function LegacySection() {
  const [selected, setSelected] = useState<LegacyPerson | null>(null);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="legacy" ref={ref} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28">
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Legacy</span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          Who's Played Here
        </h2>
        <p className="text-sm text-go-off/50 mt-3 max-w-lg">
          From World Champions to Ranji legends — Game On is built for those who compete.
        </p>
      </motion.div>

      {/* ─── Athlete Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {athletes.map((person, i) => (
          <motion.button
            key={person.name}
            onClick={() => setSelected(person)}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
            className="relative group text-left w-full cursor-pointer"
          >
            {/* Card */}
            <div
              className="relative overflow-hidden rounded-[24px] p-5 transition-all duration-500"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(600px circle at 50% 0%, ${person.gradient.replace("from-", "").replace("via-", "").replace("to-", "").trim()} 0%, transparent 70%)`,
                  opacity: 0.08,
                }}
              />

              {/* Top accent line */}
              <div
                className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
                style={{
                  background: `linear-gradient(90deg, transparent, ${person.gradient.replace("from-", "").replace("via-", "").replace("to-", "").trim()}, transparent)`,
                }}
              />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Avatar */}
                <motion.div
                  className="relative mb-4"
                  whileHover={{ scale: 1.06 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  {/* Glow ring behind */}
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-30"
                    style={{
                      background: `linear-gradient(135deg, ${person.gradient.replace("from-", "").replace("via-", "").replace("to-", "").trim()})`,
                    }}
                  />
                  {/* Glass ring */}
                  <div className="relative rounded-full p-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <AvatarFallback name={person.name} gradient={person.gradient} emoji={person.emoji} size="lg" />
                  </div>
                </motion.div>

                {/* Name */}
                <h3 className="text-base lg:text-lg font-display font-bold text-go-white group-hover:text-go-brand transition-colors duration-300">
                  {person.name}
                </h3>

                {/* Role badge */}
                <div
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-wider uppercase font-medium"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <Trophy className="w-2.5 h-2.5" />
                  {person.sport}
                </div>

                {/* Short description */}
                <p className="mt-3 text-xs text-go-off/40 leading-relaxed line-clamp-2">
                  {person.description}
                </p>

                {/* CTA */}
                <div className="mt-4 flex items-center gap-1 text-[11px] tracking-wider uppercase text-go-brand/50 group-hover:text-go-brand transition-colors duration-300 font-medium">
                  Read Story
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ─── Bottom Sheet ─── */}
      <AnimatePresence>
        {selected && <AthleteSheet person={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}