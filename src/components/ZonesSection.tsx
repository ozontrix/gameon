"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Thermometer, Wind, Sun, Building2, RefreshCw } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";
import { cn } from "@/lib/utils";

const zones = [
  {
    id: "ac-indoor",
    label: "AC Indoor",
    image: "/ac-indoor.jpeg",
    icon: <Thermometer className="w-4 h-4" />,
    description: "Climate-controlled premium play — all-weather, all-year.",
    highlights: [
      "2 Pickleball courts (pro-grade surface)",
      "2 Badminton courts (synthetic wood flooring)",
      "Consistent 22°C temperature",
      "LED floodlit, anti-glare lighting",
    ],
    color: "#F5D000",
  },
  {
    id: "non-ac-indoor",
    label: "Non-AC Indoor",
    image: "/non-ac-indoor.jpeg",
    icon: <Building2 className="w-4 h-4" />,
    description: "Covered, well-ventilated courts for high-energy play.",
    highlights: [
      "3 Badminton courts",
      "2 Cricket batting nets",
      "Cross-ventilation design",
      "High-roof clearance",
    ],
    color: "#2B3A4A",
  },
  {
    id: "outdoor",
    label: "Outdoor",
    image: "/outdoor.jpeg",
    icon: <Sun className="w-4 h-4" />,
    description: "Open-air turf under natural light and floodlights.",
    highlights: [
      "Box Cricket / Football turf (100×60 ft)",
      "2 Pickleball courts (hard surface)",
      "4 Cricket batting nets",
      "Evening floodlit play",
    ],
    color: "#F5D000",
  },
];

export function ZonesSection() {
  const [activeZone, setActiveZone] = useState("ac-indoor");
  const [autoRotate, setAutoRotate] = useState(true);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const currentZone = zones.find((z) => z.id === activeZone)!;

  // Auto-rotate through zones when in view
  useEffect(() => {
    if (!inView || !autoRotate) return;
    const timer = setInterval(() => {
      const ids = zones.map((z) => z.id);
      const currentIdx = ids.indexOf(activeZone);
      setActiveZone(ids[(currentIdx + 1) % ids.length]);
    }, 4000);
    return () => clearInterval(timer);
  }, [inView, autoRotate, activeZone]);

  return (
    <section id="zones" ref={ref} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Zone Explorer</span>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
              Choose Your Climate
            </h2>
            <p className="text-sm text-go-off/50 mt-3 max-w-lg">
              Three zones. Three vibes. Every court designed for the way you play.
            </p>
          </div>
          {/* Auto-rotate toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] tracking-wider uppercase transition-all duration-300 ${
              autoRotate ? "bg-go-brand/15 text-go-brand border border-go-brand/20" : "text-go-off/30 border border-transparent"
            }`}
          >
            <RefreshCw className={`w-3 h-3 transition-transform duration-500 ${autoRotate ? "animate-spin" : ""}`} />
            Auto
          </button>
        </div>
      </motion.div>

      {/* Segmented Control */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <SegmentedControl
          options={zones.map((z) => ({ value: z.id, label: z.label }))}
          value={activeZone}
          onChange={setActiveZone}
        />
      </motion.div>

      {/* Zone Detail Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeZone}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Visual panel */}
            <div className="lg:col-span-3 relative rounded-[28px] overflow-hidden min-h-[280px] lg:min-h-[360px]">
              {/* Background image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${currentZone.image})`,
                }}
              />
              {/* Overlay gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${currentZone.color}60 0%, ${currentZone.color}30 50%, transparent 100%)`,
                }}
              />
              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: "48px 48px",
                }}
              />

              <div className="relative z-10 p-6 lg:p-8 h-full flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: currentZone.color }}
                  />
                  <span className="text-xs tracking-wider uppercase text-go-off/60 font-medium">{currentZone.label}</span>
                </div>
                <p className="text-lg lg:text-xl font-medium text-go-white max-w-md">
                  {currentZone.description}
                </p>
              </div>
            </div>

            {/* Highlights list */}
            <div className="lg:col-span-2 glass-subtle rounded-[28px] p-6 lg:p-8 flex flex-col justify-center">
              <h4 className="text-sm font-display font-bold text-go-white mb-5">What's Inside</h4>
              <ul className="space-y-4">
                {currentZone.highlights.map((h, i) => (
                  <motion.li
                    key={h}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                      style={{ background: currentZone.color }}
                    />
                    <span className="text-sm text-go-off/70">{h}</span>
                  </motion.li>
                ))}
              </ul>

              {/* Zone stat */}
              <div className="mt-6 pt-6 border-t border-go-border-subtle">
                <div className="flex items-center gap-2 text-xs text-go-off/40">
                  <Wind className="w-3.5 h-3.5" />
                  {activeZone === "ac-indoor" ? "All-weather, temperature-controlled" :
                   activeZone === "non-ac-indoor" ? "Covered with natural ventilation" :
                   "Open-air with evening floodlights"}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}