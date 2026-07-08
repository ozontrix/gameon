"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function LocationCard() {
  return (
    <section className="scroll-section py-16 px-6" id="location">
      <motion.div
        className="max-w-sm mx-auto glass-panel p-6 md:p-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gameon-yellow/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-gameon-yellow" />
          </div>
          <div>
            <h3 className="font-display text-xl tracking-tight text-gameon-off-white mb-1">
              Sector 70, Gurugram
            </h3>
            <p className="text-sm text-gameon-off-white/60 leading-relaxed mb-4">
              1.5 acres. Indoor AC courts. Café. Landscaped social deck.
            </p>
            <a
              href="https://maps.google.com/?q=Sector+70+Gurugram"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs tracking-wider uppercase text-gameon-yellow-dim hover:text-gameon-yellow transition-colors font-medium"
            >
              Get Directions
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}