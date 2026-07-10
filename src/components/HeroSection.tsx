"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import { MapPin, Bell, ArrowRight, Sparkles, Swords, Table, Goal, Timer } from "lucide-react";
import { GlassCard } from "./GlassCard";

const stats = [
  { value: 1000, prefix: "", suffix: "+", label: "Monthly Active Players", subtitle: "Target Year-1" },
  { value: 5, label: "Badminton Courts", subtitle: "2 AC + 3 Non-AC" },
  { value: 4, label: "Pickleball Courts", subtitle: "2 Indoor AC + 2 Outdoor" },
  { value: 6, label: "Cricket Nets", subtitle: "2 Indoor + 4 Outdoor" },
];

// ─── Countdown Timer ───
function CountdownTimer() {
  const launchDate = useMemo(() => new Date("2025-07-01T00:00:00+05:30"), []);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const update = () => {
      const diff = launchDate.getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [launchDate]);

  return (
    <motion.div
      className="flex items-center gap-3 text-[10px] tracking-[0.15em] uppercase text-go-brand/80 font-medium"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Timer className="w-3 h-3" />
      <span>Opening in</span>
      <span className="tabular-nums font-bold text-go-brand">
        {timeLeft.days}d
      </span>
      <span className="text-go-off/30">:</span>
      <span className="tabular-nums font-bold text-go-brand">
        {timeLeft.hours.toString().padStart(2, "0")}h
      </span>
      <span className="text-go-off/30">:</span>
      <span className="tabular-nums font-bold text-go-brand">
        {timeLeft.minutes.toString().padStart(2, "0")}m
      </span>
    </motion.div>
  );
}

const sportsRotator = [
  { text: "Pickleball", icon: "🏓" },
  { text: "Badminton", icon: "🏸" },
  { text: "Box Cricket", icon: "🏏" },
  { text: "Football", icon: "⚽" },
];

interface HeroSectionProps {
  onNotifyClick: () => void;
}

// ─── Floating particle ───
function FloatingParticle({ delay = 0, size = 4, x = 0, y = 0, color = "brand" }: {
  delay?: number;
  size?: number;
  x?: number;
  y?: number;
  color?: string;
}) {
  const bgColor = color === "brand" ? "bg-go-brand" : "bg-go-white/10";
  return (
    <motion.div
      className={`absolute rounded-full ${bgColor} pointer-events-none`}
      style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
        y: [0, -80 - Math.random() * 60],
        x: [0, (Math.random() - 0.5) * 40],
      }}
      transition={{
        duration: 4 + Math.random() * 3,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// ─── Floating court lines decorative ───
function CourtLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {/* Horizontal lines */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          top: "30%",
          background: "linear-gradient(90deg, transparent, rgba(245, 166, 35, 0.12), transparent)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
      />
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          top: "55%",
          background: "linear-gradient(90deg, transparent, rgba(245, 166, 35, 0.08), transparent)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.6 }}
      />
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          top: "75%",
          background: "linear-gradient(90deg, transparent, rgba(245, 166, 35, 0.06), transparent)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.9 }}
      />
      {/* Vertical center line */}
      <motion.div
        className="absolute top-0 bottom-0 w-px left-1/2"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(245, 166, 35, 0.06), transparent)",
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
    </div>
  );
}

export function HeroSection({ onNotifyClick }: HeroSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [sportIndex, setSportIndex] = useState(0);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const statOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);

  // Rotate through sports
  useEffect(() => {
    const timer = setInterval(() => {
      setSportIndex((prev) => (prev + 1) % sportsRotator.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Parallax mouse tracking
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [mouseX, mouseY]);

  // ─── Gyroscope / Device Orientation Parallax ───
  useEffect(() => {
    // Only run on devices that support DeviceOrientationEvent
    if (typeof window === "undefined") return;
    if (!window.DeviceOrientationEvent) return;

    let granted = false;
    let listening = false;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // gamma: left(-) to right(+) tilt, range ~ -90 to 90
      // beta: front(-) to back(+) tilt, range ~ -180 to 180
      const g = e.gamma ?? 0;   // left-right
      const b = e.beta ?? 0;    // front-back

      // Clamp and normalise to 0-1 range (centered at 0.5)
      const clampedG = Math.max(-45, Math.min(45, g));
      const clampedB = Math.max(-45, Math.min(45, b));
      const nx = (clampedG + 45) / 90;   // 0..1
      const ny = (clampedB + 45) / 90;   // 0..1

      mouseX.set(nx);
      mouseY.set(ny);
    };

    const startListening = () => {
      if (listening) return;
      window.addEventListener("deviceorientation", handleOrientation);
      listening = true;
    };

    // iOS 13+ requires explicit permission
    const DeviceOrientationEventAny = window.DeviceOrientationEvent as
      | (typeof window.DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> })
      | undefined;

    if (DeviceOrientationEventAny?.requestPermission) {
      // iOS 13+ path — we request permission on first user interaction
      const requestPermission = async () => {
        try {
          const result = await DeviceOrientationEventAny.requestPermission!();
          granted = result === "granted";
          if (granted) startListening();
        } catch {
          // fallback: just try listening anyway
          startListening();
        }
      };

      // Try to request on touch/click (first user interaction)
      const onInteraction = () => {
        if (!granted && !listening) requestPermission();
        window.removeEventListener("touchstart", onInteraction);
        window.removeEventListener("click", onInteraction);
      };
      window.addEventListener("touchstart", onInteraction, { once: true });
      window.addEventListener("click", onInteraction, { once: true });

      // Also try immediately (some browsers may already have permission)
      requestPermission();

      return () => {
        window.removeEventListener("deviceorientation", handleOrientation);
        window.removeEventListener("touchstart", onInteraction);
        window.removeEventListener("click", onInteraction);
      };
    } else {
      // Non-iOS path — just listen
      startListening();
      return () => {
        window.removeEventListener("deviceorientation", handleOrientation);
      };
    }
  }, [mouseX, mouseY]);

  const bgX = useTransform(smoothX, [0, 1], [-15, 15]);
  const bgY = useTransform(smoothY, [0, 1], [-15, 15]);

  return (
    <section
      id="hero"
      ref={ref}
      className="relative h-screen w-full overflow-hidden bg-go-black"
    >
      {/* ─── Background Image Layer ─── */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ scale: bgScale, x: bgX, y: bgY }}
      >
        {/* Background image — high-quality sports facility stock */}
        <div className="absolute inset-0 bg-[url('/hero_background.png')] bg-cover bg-center bg-no-repeat" />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-go-black/70 via-go-black/40 to-go-black z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-go-black/80 via-transparent to-go-black/50 z-10" />

        {/* Brand color wash */}
        <div className="absolute inset-0 z-[5] mix-blend-overlay opacity-20"
          style={{
            background: `linear-gradient(135deg, rgba(245, 166, 35, 0.3) 0%, transparent 50%, rgba(245, 166, 35, 0.1) 100%)`,
          }}
        />
      </motion.div>

      {/* ─── Court Lines Decorative ─── */}
      <CourtLines />

      {/* ─── Floating Particles ─── */}
      <FloatingParticle delay={0} size={3} x={15} y={20} />
      <FloatingParticle delay={1.2} size={5} x={85} y={25} />
      <FloatingParticle delay={2.5} size={3} x={25} y={60} />
      <FloatingParticle delay={0.8} size={4} x={75} y={55} />
      <FloatingParticle delay={3} size={3} x={50} y={15} />
      <FloatingParticle delay={1.8} size={2} x={10} y={45} />
      <FloatingParticle delay={2.2} size={4} x={90} y={70} />

      {/* ─── Top Corner Brand Number ─── */}
      <motion.div
        className="absolute top-6 right-6 lg:top-10 lg:right-10 z-30 text-right hidden lg:block"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="text-[9px] tracking-[0.25em] uppercase text-go-off/30 font-medium">Est. 2025</div>
        <div className="text-xs tracking-wider text-go-brand/60 font-medium">Sector 70, Gurugram</div>
      </motion.div>

      {/* ─── Content ─── */}
      <motion.div
        className="relative z-20 flex flex-col h-full w-full px-6 sm:px-8 lg:px-14 xl:px-20"
        style={{ y: contentY }}
      >
        <div className="pt-6 lg:pt-10 shrink-0" />

        {/* ─── Center Content ─── */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Pre-heading badge */}
          <motion.div
            className="mb-6 mt-12 lg:mt-16"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[10px] tracking-[0.18em] uppercase text-go-off/50 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-go-brand animate-pulse" />
              India's Premier Multisport Destination
            </span>
          </motion.div>

          {/* Logo */}
          <motion.div
            className="w-full max-w-[380px] lg:max-w-[480px] xl:max-w-[540px]"
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.2 }}
          >
            <Image
              src="/game_on.png"
              alt="Game On — Premium Multisports Destination"
              width={540}
              height={162}
              priority
              className="object-contain w-full h-auto"
              style={{ width: "auto", height: "auto" }}
            />
          </motion.div>

          {/* Sports Rotator */}
          <motion.div
            className="mt-6 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-xs text-go-off/40 tracking-wider uppercase">Play</span>
            <motion.span
              key={sportIndex}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-bold text-go-brand tracking-wider uppercase flex items-center gap-2"
            >
              {sportsRotator[sportIndex].icon} {sportsRotator[sportIndex].text}
            </motion.span>
            <span className="text-xs text-go-off/40 tracking-wider uppercase">Every Day</span>
          </motion.div>

          {/* Tagline with word-by-word reveal */}
          <motion.div
            className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-1"
            initial="hidden"
            animate="visible"
          >
            {["Play.", "Compete.", "Connect."].map((word, i) => (
              <motion.span
                key={word}
                className="text-lg lg:text-xl font-display text-go-off tracking-[0.15em] uppercase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 200, damping: 20 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            className="w-16 h-[2px] rounded-full mt-5"
            style={{ background: "linear-gradient(90deg, transparent, var(--go-brand), transparent)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
          />

          {/* Subtitle */}
          <motion.p
            className="text-xs text-go-off/30 tracking-wider mt-5 max-w-md text-center leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            1.5 acres of premium air-conditioned & open-air courts.
            <br />
            5 badminton, 4 pickleball, 6 cricket nets, box cricket turf & more.
          </motion.p>

          {/* CTA with glow effect */}
          <motion.div
            className="mt-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 1.3 }}
          >
            <button
              onClick={onNotifyClick}
              className="group relative bg-go-brand text-go-black font-bold text-sm tracking-[0.12em] uppercase rounded-full py-4 px-10 flex items-center justify-center gap-3 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,166,35,0.4)]"
            >
              {/* Ripple border */}
              <span className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-go-brand/30 transition-all duration-500" />
              {/* Sweep */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <Bell className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Get Early Access</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* ─── Glass Stat Strip ─── */}
        <motion.div
          className="shrink-0 pb-6 lg:pb-10"
          style={{ opacity: statOpacity }}
        >
          <GlassCard
            variant="subtle"
            className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-[28px]"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-4 lg:p-5 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 + i * 0.08, duration: 0.4 }}
              >
                <span className="text-2xl lg:text-3xl font-display text-go-brand font-bold tabular-nums">
                  {stat.prefix || ""}
                  <AnimatedNumber to={stat.value} />
                  {stat.suffix || ""}
                </span>
                <span className="text-xs font-medium text-go-off/70 mt-1 leading-tight">{stat.label}</span>
                {stat.subtitle && (
                  <span className="text-[10px] text-go-off/40 mt-0.5">{stat.subtitle}</span>
                )}
              </motion.div>
            ))}
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
      >
        <span className="text-[9px] tracking-[0.2em] uppercase text-go-off/20 font-medium">Scroll to explore</span>
        <motion.div
          className="w-4 h-6 rounded-full border border-go-border-subtle flex items-start justify-center pt-1"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-1 h-1.5 rounded-full bg-go-brand/60"
            animate={{ y: [0, 4, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>

      {/* Bottom gradient overlay that fades in on scroll */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none"
        style={{
          opacity: overlayOpacity,
          background: "linear-gradient(to top, var(--go-black), transparent)",
        }}
      />
    </section>
  );
}

// ─── Animated Counter component ───
function AnimatedNumber({ to }: { to: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const steps = 30;
          const increment = to / steps;
          const interval = 2000 / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= to) {
              setCount(to);
              clearInterval(timer);
            } else {
              setCount(Math.round(current));
            }
          }, interval);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{count}</span>;
}