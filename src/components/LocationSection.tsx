"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Navigation, Clock, Car, Building2, LocateFixed } from "lucide-react";

export function LocationSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const connectivity = ["SPR Road", "Dwarka Expressway", "NH-48"];

  const proximity = [
    { value: "10 min", label: "Cyber City" },
    { value: "Minutes", label: "Dwarka Expressway" },
    { value: "Direct", label: "NH-48 Access" },
  ];

  const highlights = [
    {
      icon: Car,
      title: "Sector 70, Gurugram",
      desc: "Right in a rapidly evolving Gurugram corridor",
    },
    {
      icon: Building2,
      title: "Growing Residential Communities",
      desc: "New homes, schools & neighbourhoods rising nearby",
    },
    {
      icon: Clock,
      title: "Open Daily",
      desc: "6:00 AM – 11:00 PM",
    },
  ];

  return (
    <section id="location" ref={ref} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28">
      {/* ─── Header ─── */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Location</span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          At the Heart of <span className="text-go-brand">What&apos;s Next</span>
        </h2>
        <p className="text-sm text-go-off/50 mt-3 max-w-xl">
          Right in Sector 70, Gurugram — GameOn sits in a rapidly evolving
          Gurugram corridor, with growing residential communities and improving
          connectivity to SPR, Dwarka Expressway & NH-48.
        </p>
      </motion.div>

      {/* ─── Destination Card ─── */}
      <motion.div
        className="glass rounded-[28px] overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid lg:grid-cols-2">
          {/* ─── Map Panel — live Google Maps embed ─── */}
          <div className="relative min-h-[320px] lg:min-h-[460px] bg-go-navy/20 overflow-hidden">
            <iframe
              src="https://maps.google.com/maps?q=28.394899,77.014454&amp;z=16&amp;output=embed"
              className="absolute inset-0 w-full h-full"
              style={{ border: 0, filter: "saturate(0.9) contrast(1.05)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="GameOn Multi Sports — SportsCube Center for Excellence, Sector 70, Gurugram"
            />

            {/* Floating venue chip overlay */}
            <motion.div
              className="absolute bottom-5 left-5 z-10 rounded-2xl px-4 py-3 max-w-[220px] bg-[rgba(14,17,22,0.88)] backdrop-blur-md border border-white/[0.08] shadow-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <span className="block text-xs font-semibold text-go-white">GameOn Multi Sports</span>
              <span className="block text-[10px] text-go-off/50 mt-0.5">Sector 70, Gurugram</span>
            </motion.div>
          </div>

            {/* ─── Info Panel ─── */}
            <div className="p-6 lg:p-8 flex flex-col justify-center">
              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.15 }}
              >
                <h3 className="text-xl font-display font-bold text-go-white mb-1">
                  GameOn Multi Sports
                </h3>
                <p className="text-sm text-go-off/50 mb-5">
                  Sports Cube Campus, Sector 70, Gurugram, Haryana 122101
                </p>
              </motion.div>

              {/* Connectivity chips */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.25 }}
              >
                <p className="text-[10px] tracking-wider uppercase text-go-off/40 font-medium mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-go-brand" />
                  Fast Connectivity
                </p>
                <div className="flex flex-wrap gap-2">
                  {connectivity.map((road) => (
                    <span
                      key={road}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-go-brand/10 border border-go-brand/20 text-[10px] font-semibold uppercase tracking-wider text-go-brand"
                    >
                      <LocateFixed className="w-3 h-3" />
                      {road}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Location benefits */}
              <div className="space-y-4 mb-6">
                {highlights.map((h, i) => (
                  <motion.div
                    key={h.title}
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-go-white-glass transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.35 + i * 0.1 }}
                  >
                    <h.icon className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm text-go-off/80 font-medium">{h.title}</span>
                      <p className="text-xs text-go-off/40 mt-0.5">{h.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Proximity stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {proximity.map((s, i) => (
                  <motion.div
                    key={s.label}
                    className="rounded-2xl p-3 bg-go-white-glass border border-white/[0.06] text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.6 + i * 0.1 }}
                  >
                    <span className="block text-base font-display font-bold text-go-brand leading-none">
                      {s.value}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-go-off/40 mt-1.5">
                      {s.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.a
                href="https://www.google.com/maps/dir/?api=1&amp;destination=28.394899,77.014454"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-go-brand text-go-white text-sm font-semibold tracking-wider uppercase rounded-full py-3 px-6 hover:bg-go-brand/90 transition-all duration-300 w-fit group"
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.75 }}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Navigation className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                Get Directions
              </motion.a>
            </div>
          </div>
      </motion.div>
    </section>
  );
}