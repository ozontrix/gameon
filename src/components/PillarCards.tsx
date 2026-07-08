"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface Pillar {
  title: string;
  subtitle: string;
  emoji: string;
  body: string;
}

const pillars: Pillar[] = [
  {
    title: "Play",
    subtitle: "Every court. Every surface.",
    emoji: "🏟️",
    body: "Indoor. Outdoor. Climate-controlled. Professional-grade courts for every sport.",
  },
  {
    title: "Perform",
    subtitle: "Train like a pro.",
    emoji: "⚡",
    body: "Academies, pro coaching, youth development programs led by certified experts.",
  },
  {
    title: "Belong",
    subtitle: "Your community. Your club.",
    emoji: "🤝",
    body: "Families, corporates, women's sessions, weekend leagues — everyone's welcome.",
  },
  {
    title: "Grow",
    subtitle: "Gurugram first. India next.",
    emoji: "🌏",
    body: "Gurugram first. Every Indian city next. A national network in the making.",
  },
];

function PillarCard({ pillar, index }: { pillar: Pillar; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className="pillar-card-snap flex-shrink-0 w-[280px] md:w-[300px] p-6 glass-panel cursor-pointer select-none"
      style={{ transformStyle: "preserve-3d", transition: "transform 0.15s ease-out" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-3xl mb-4">{pillar.emoji}</div>
      <h3 className="font-display text-2xl tracking-tight text-gameon-off-white mb-1">
        {pillar.title}
      </h3>
      <p className="text-xs tracking-wider uppercase text-gameon-yellow-dim font-medium mb-3">
        {pillar.subtitle}
      </p>
      <p className="text-sm text-gameon-off-white/60 leading-relaxed">
        {pillar.body}
      </p>
    </motion.div>
  );
}

export default function PillarCards() {
  return (
    <section className="scroll-section py-16 px-6" id="pillars">
      <div className="max-w-lg mx-auto">
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-gameon-off-white mb-6 text-center">
          Four Pillars
        </h2>
        <p className="text-sm text-gameon-off-white/50 text-center mb-8 max-w-xs mx-auto">
          Everything we're building, in four words.
        </p>
      </div>

      <div className="pillar-snap hide-scrollbar flex gap-4 pb-4 px-4 md:justify-center md:flex-wrap">
        {pillars.map((pillar, i) => (
          <PillarCard key={pillar.title} pillar={pillar} index={i} />
        ))}
      </div>
    </section>
  );
}