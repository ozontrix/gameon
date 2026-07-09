"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Navigation, Clock, Car, Building2 } from "lucide-react";

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
          <div className="relative min-h-[280px] lg:min-h-[360px] bg-gradient-to-br from-go-navy/30 to-go-black">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />
            {/* Radial accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-go-brand/20 blur-[60px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-go-brand mx-auto mb-2" />
                <p className="text-sm font-medium text-go-white">Sports Cube Campus</p>
                <p className="text-xs text-go-off/50 mt-1">Sector 70, Gurugram</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 lg:p-8 flex flex-col justify-center">
            <h3 className="text-xl font-display font-bold text-go-white mb-1">
              Sports Cube Campus
            </h3>
            <p className="text-sm text-go-off/50 mb-6">
              Sector 70, Gurugram, Haryana 122101
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Car className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm text-go-off/80 font-medium">Golf Course Extension Road</span>
                  <p className="text-xs text-go-off/40 mt-0.5">10 min from DLF Phase 2 & Cyber City</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm text-go-off/80 font-medium">Business Park Corridor</span>
                  <p className="text-xs text-go-off/40 mt-0.5">Surrounded by major corporate hubs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-go-brand mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm text-go-off/80 font-medium">Open Daily</span>
                  <p className="text-xs text-go-off/40 mt-0.5">6:00 AM – 11:00 PM</p>
                </div>
              </div>
            </div>

            <a
              href="https://maps.apple.com/?address=Sector+70,Gurugram,Haryana+122101"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-go-brand text-go-white text-sm font-semibold tracking-wider uppercase rounded-full py-3 px-6 hover:bg-go-brand/90 transition-colors w-fit"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}