"use client";

import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface StackedCardProps {
  children: ReactNode;
  index: number;
  totalCards: number;
  className?: string;
}

/**
 * StackedCard wraps a section with a card-like entrance animation.
 * As the section scrolls into view, it slides up from below with
 * rounded top corners, creating the feel of a card being pulled
 * up and stacking on the previous section.
 *
 * The section remains in normal page flow — no internal scroll,
 * natural content height.
 */
export function StackedCard({
  children,
  index,
  totalCards,
  className = "",
}: StackedCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Track progress from when section enters viewport to when it reaches the top
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  // Card slides up from below
  const cardY = useTransform(scrollYProgress, [0, 1], ["140px", "0px"]);

  // Rounded top corners — stays rounded even when locked in for a distinct card look
  const borderRadius = useTransform(
    scrollYProgress,
    [0, 1],
    ["36px", "28px"]
  );

  // Scale: slightly compressed when below, natural when locked
  const cardScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 0.98, 1]);

  // Content fades in smoothly
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 0.3, 0.8, 1]
  );

  // Subtle 3D perspective rotation
  const rotateX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["4deg", "1.5deg", "0deg"]
  );

  // Brand accent line draws in from the left
  const accentScaleX = useTransform(scrollYProgress, [0.5, 1], [0, 1]);

  // Subtle shadow increases as card locks in — gives stacking depth
  const topShadow = useTransform(
    scrollYProgress,
    [0, 0.8, 1],
    [
      "0 0 0px rgba(0,0,0,0)",
      `0 -2px 0px rgba(245,166,35,0.03), 0 -4px 20px -10px rgba(0,0,0,${0.2 + (index / totalCards) * 0.2})`,
      `0 -2px 0px rgba(245,166,35,0.04), 0 -8px 30px -12px rgba(0,0,0,${0.25 + (index / totalCards) * 0.35})`,
    ]
  );

  return (
    <div
      ref={ref}
      className="relative"
      style={{ zIndex: 50 + index }}
    >
      {/* ─── The card ─── */}
      <motion.div
        className={`relative ${className}`}
        style={{
          y: cardY,
          scale: cardScale,
          rotateX: rotateX,
          perspective: 1000,
          transformOrigin: "50% 100%",
          borderRadius: borderRadius,
          overflow: "hidden",
          boxShadow: topShadow,
          willChange: "transform, opacity, border-radius",
          // Each card gets its own unique dark iridescent gradient — distinct from the page's flat black
          background: [
            "linear-gradient(170deg, #0E0E18 0%, #0A0A12 30%, #080810 60%, #06060A 100%)",           // card 1: deep aubergine
            "linear-gradient(175deg, #0F1210 0%, #0B0E0C 30%, #090C0A 60%, #070807 100%)",             // card 2: midnight emerald
            "linear-gradient(168deg, #12100E 0%, #0E0C0A 30%, #0B0A08 60%, #080706 100%)",             // card 3: dark sepia
            "linear-gradient(173deg, #0F0E1A 0%, #0B0A15 30%, #090813 60%, #06060D 100%)",             // card 4: dark violet
            "linear-gradient(172deg, #0E1212 0%, #0A0E0E 30%, #080B0B 60%, #060808 100%)",             // card 5: dark teal
            "linear-gradient(176deg, #120E0E 0%, #0E0A0A 30%, #0B0808 60%, #080606 100%)",             // card 6: dark rose
            "linear-gradient(169deg, #0E1016 0%, #0A0C12 30%, #080A0F 60%, #06070C 100%)",             // card 7: midnight blue
          ][index % 7],
        }}
      >
        {/* ─── Brand accent line at top edge ─── */}
        <motion.div
          className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
          style={{
            height: 2,
            scaleX: accentScaleX,
            transformOrigin: "left center",
            background:
              "linear-gradient(90deg, var(--go-brand) 0%, color-mix(in srgb, var(--go-brand) 60%, transparent) 50%, transparent 100%)",
          }}
        />

        {/* ─── Top glow ─── */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-20"
          style={{
            opacity: useTransform(scrollYProgress, [0.4, 1], [0, 1]),
            background: `linear-gradient(180deg, 
              color-mix(in srgb, var(--go-brand) ${1 + index * 0.5}%, transparent) 0%, 
              transparent 100%
            )`,
          }}
        />

        {/* ─── Content (natural flow, no internal scroll) ─── */}
        <motion.div
          className="relative z-10"
          style={{ opacity: contentOpacity }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}