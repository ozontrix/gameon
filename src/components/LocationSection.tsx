"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Navigation, Clock, Car, Building2, LocateFixed } from "lucide-react";

// ─── Animated Dropped Pin ───
function AnimatedPin() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      {/* Shadow */}
      <motion.div
        className="w-6 h-2 rounded-full bg-go-brand/30 mx-auto"
        animate={{ scale: [1, 0.7, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Pin body */}
      <motion.div
        className="relative -mt-2"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glow */}
        <div className="absolute -top-2 -left-2 w-12 h-12 rounded-full bg-go-brand/20 blur-xl" />
        {/* Pin */}
        <svg
          width="32"
          height="44"
          viewBox="0 0 32 44"
          fill="none"
          className="relative"
        >
          <defs>
            <linearGradient id="pinGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#D47900" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="40" rx="6" ry="2" fill="#F5A623" opacity="0.3" />
          <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 44 16 44C16 44 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="url(#pinGradient)" />
          <circle cx="16" cy="15" r="6" fill="#0B0B0C" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

export function LocationSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="location" ref={ref} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Location</span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          Find Us
        </h2>
        <p className="text-sm text-go-off/50 mt-3 max-w-lg">
          Golf Course Extension Road. 10 minutes from Cyber City.
        </p>
      </motion.div>

      {/* Destination Card */}
      <motion.div
        className="glass rounded-[28px] overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid lg:grid-cols-2">
          {/* Map Placeholder */}
          <div className="relative min-h-[300px] lg:min-h-[380px] bg-gradient-to-br from-go-navy/30 to-go-black overflow-hidden">
            {/* Grid background */}
            <motion.div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
              animate={{ backgroundPosition: ["0px 0px", "40px 40px"] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            {/* Radial accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-go-brand/15 blur-[80px]" />
            
            {/* Pin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatedPin />
            </div>

            {/* Small satellite dots */}
            {[
              { x: "25%", y: "30%", size: 2, delay: 0 },
              { x: "75%", y: "40%", size: 3, delay: 0.5 },
              { x: "20%", y: "70%", size: 2, delay: 1 },
              { x: "80%", y: "60%", size: 2.5, delay: 1.5 },
              { x: "50%", y: "25%", size: 2, delay: 0.3 },
              { x: "65%", y: "75%", size: 1.5, delay: 0.8 },
            ].map((dot, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-go-brand/40"
                style={{ left: dot.x, top: dot.y, width: dot.size, height: dot.size }}
                animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: dot.delay, ease: "easeInOut" }}
              />
            ))}
          </div>

          {/* Details */}
          <div className="p-6 lg:p-8 flex flex-col justify-center">
            <h3 className="text-xl font-display font-bold text-go-white mb-1">
              Sports Cube Campus
            </h3>
            <p className="text-sm text-go-off/50 mb-6">
              Sector 70, Gurugram, Haryana 122101
            </p>

            {/* 3D distance badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-go-brand/10 border border-go-brand/20 mb-6 w-fit"
              initial={{ opacity: 0, x: -10 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 }}
            >
              <LocateFixed className="w-3.5 h-3.5 text-go-brand" />
              <span className="text-[10px] tracking-wider uppercase text-go-brand font-medium">~2.5 km from Golf Course Road</span>
            </motion.div>

            <div className="space-y-4 mb-6">
              <motion.div
                className="flex items-start gap-3 p-3 rounded-2xl hover:bg-go-white-glass transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.15 }}
              >
                <Car className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm text-go-off/80 font-medium">Golf Course Extension Road</span>
                  <p className="text-xs text-go-off/40 mt-0.5">10 min from DLF Phase 2 & Cyber City</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-start gap-3 p-3 rounded-2xl hover:bg-go-white-glass transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.25 }}
              >
                <Building2 className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm text-go-off/80 font-medium">Business Park Corridor</span>
                  <p className="text-xs text-go-off/40 mt-0.5">Surrounded by major corporate hubs</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-start gap-3 p-3 rounded-2xl hover:bg-go-white-glass transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.35 }}
              >
                <Clock className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm text-go-off/80 font-medium">Open Daily</span>
                  <p className="text-xs text-go-off/40 mt-0.5">6:00 AM – 11:00 PM</p>
                </div>
              </motion.div>
            </div>

            <motion.a
              href="https://maps.apple.com/?address=Sector+70,Gurugram,Haryana+122101"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-go-brand text-go-white text-sm font-semibold tracking-wider uppercase rounded-full py-3 px-6 hover:bg-go-brand/90 transition-all duration-300 w-fit group"
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
