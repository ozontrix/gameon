"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Bell, MapPin, X, Send, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";

// ─── Form Schema ───
const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone required").max(15),
});

type FormData = z.infer<typeof formSchema>;

// ─── Confetti ───
function fireConfetti() {
  const defaults = { spread: 60, ticks: 100, gravity: 0.8, decay: 0.94, startVelocity: 30, colors: ["#F5D000", "#0B0B0C", "#F3F2ED"] };
  confetti({ ...defaults, particleCount: 40, angle: 60, origin: { x: 0, y: 0.8 } });
  confetti({ ...defaults, particleCount: 40, angle: 120, origin: { x: 1, y: 0.8 } });
}

// ─── Spring config ───
const spring = { type: "spring" as const, stiffness: 300, damping: 24 };
const softSpring = { type: "spring" as const, stiffness: 200, damping: 20 };

// ─── Animated Counter ───
function AnimatedCounter({ from = 0, to, suffix = "" }: { from?: number; to: number; suffix?: string }) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 30;
    const increment = (to - from) / steps;
    const interval = duration / steps;
    let current = from;
    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, interval);
    return () => clearInterval(timer);
  }, [inView, from, to]);

  return (
    <span ref={ref} className="flip-digit text-4xl md:text-5xl text-gameon-yellow tabular-nums">
      {count}{suffix}
    </span>
  );
}

// ─── Main Page ───
export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    // Stagger entrance after mount
    const t = setTimeout(() => setContentLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey && supabaseUrl !== "https://your-project.supabase.co") {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("gameon_waitlist").insert({ name: data.name, email: data.email, phone: data.phone, created_at: new Date().toISOString() });
      }
      fireConfetti();
      setSubmitted(true);
    } catch {
      fireConfetti();
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12, delayChildren: 0.3 },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 200, damping: 20 },
    },
  } as const;

  return (
    <div className="min-h-screen bg-gameon-black flex items-center justify-center overflow-hidden p-0 md:p-8">
      {/* Desktop frame */}
      <div className="relative w-full min-h-screen md:min-h-0 md:max-w-[430px] md:h-[932px] md:rounded-[48px] md:border-8 md:border-gameon-black-soft md:shadow-2xl md:shadow-gameon-yellow/5 md:overflow-hidden bg-gameon-black">
        
        {/* Court-line grid background */}
        <div className="absolute inset-0 court-line-bg" />

        {/* Floodlight glow */}
        <div className="floodlight-glow top-1/4 left-1/2 -translate-x-1/2" />

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center justify-center min-h-screen md:min-h-[868px] px-8 py-16"
          variants={containerVariants}
          initial="hidden"
          animate={contentLoaded ? "visible" : "hidden"}
        >
          {/* Status badge */}
          <motion.div
            variants={itemVariants}
            className="glass-panel px-5 py-2 rounded-full mb-8"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-gameon-yellow animate-pulse" />
              <span className="text-xs tracking-[0.15em] uppercase text-gameon-yellow-dim font-medium">
                Coming Soon
              </span>
            </div>
          </motion.div>

          {/* Wordmark */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-7xl sm:text-8xl md:text-9xl tracking-tight leading-none text-gameon-off-white text-center"
          >
            GAME ON
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="text-sm md:text-base text-gameon-off-white/50 font-medium tracking-wide text-center max-w-xs mt-4"
          >
            India's premium multi-sports destination
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-8 md:gap-12 mt-10"
          >
            <div className="flex flex-col items-center gap-1">
              <AnimatedCounter to={5} suffix="+" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-gameon-yellow-dim">Sports</span>
            </div>
            <div className="w-px h-10 bg-gameon-line" />
            <div className="flex flex-col items-center gap-1">
              <AnimatedCounter to={4} />
              <span className="text-[10px] uppercase tracking-[0.15em] text-gameon-yellow-dim">Pillars</span>
            </div>
            <div className="w-px h-10 bg-gameon-line" />
            <div className="flex flex-col items-center gap-1">
              <AnimatedCounter to={1} suffix="" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-gameon-yellow-dim">Address</span>
            </div>
          </motion.div>

          {/* Location */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mt-10"
          >
            <MapPin className="w-3.5 h-3.5 text-gameon-yellow-dim" />
            <span className="text-xs tracking-wider text-gameon-yellow-dim/70 font-medium">
              Sector 70, Gurugram
            </span>
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={itemVariants}
            className="mt-10 w-full max-w-xs"
          >
            <motion.button
              onClick={() => {
                setModalOpen(true);
                setSubmitted(false);
              }}
              className="w-full bg-gameon-yellow text-gameon-black font-semibold text-sm tracking-wider uppercase rounded-full py-4 flex items-center justify-center gap-2 shadow-lg shadow-gameon-yellow/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={spring}
            >
              <Bell className="w-4 h-4" />
              Notify Me
            </motion.button>
          </motion.div>

          {/* Secondary CTA */}
          <motion.a
            variants={itemVariants}
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-xs tracking-wider uppercase text-gameon-yellow-dim/50 hover:text-gameon-yellow transition-colors font-medium"
          >
            Updates on WhatsApp →
          </motion.a>

          {/* Footer */}
          <motion.div
            variants={itemVariants}
            className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4"
          >
            <div className="w-8 h-px bg-gameon-line" />
            <p className="text-[10px] text-gameon-off-white/20 tracking-widest uppercase">
              A Splitwaters Company
            </p>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gameon-off-white/20 hover:text-gameon-yellow transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-gameon-off-white/20 hover:text-gameon-yellow transition-colors" aria-label="X / Twitter">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── Modal Overlay ─── */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setModalOpen(false);
              }}
            >
              <motion.div
                className="glass-panel w-full md:max-w-sm mx-4 mb-0 md:mb-0 rounded-b-none md:rounded-b-[28px] rounded-t-[28px] p-6 md:p-8"
                initial={{ y: 300, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 300, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              >
                {/* Close button */}
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gameon-off-white/60" />
                </button>

                {submitted ? (
                  <motion.div
                    className="flex flex-col items-center gap-4 py-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={spring}
                  >
                    <div className="w-16 h-16 rounded-full bg-gameon-yellow/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-gameon-yellow" />
                    </div>
                    <p className="font-display text-2xl text-gameon-off-white">You're In!</p>
                    <p className="text-sm text-gameon-off-white/60 text-center">
                      We'll reach out the moment doors open.
                    </p>
                    <motion.button
                      onClick={() => setModalOpen(false)}
                      className="mt-4 text-xs tracking-wider uppercase text-gameon-yellow-dim hover:text-gameon-yellow transition-colors font-medium"
                      whileTap={{ scale: 0.96 }}
                    >
                      Close
                    </motion.button>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h3 className="font-display text-2xl text-gameon-off-white mb-1">Be First On Court</h3>
                      <p className="text-sm text-gameon-off-white/50">Early-access member pricing + launch invite.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
                      <div>
                        <input
                          {...register("name")}
                          placeholder="Your name"
                          className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors"
                        />
                        {errors.name && <p className="text-xs text-red-400 mt-1 px-1">{errors.name.message}</p>}
                      </div>
                      <div>
                        <input
                          {...register("email")}
                          type="email"
                          placeholder="Email address"
                          className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors"
                        />
                        {errors.email && <p className="text-xs text-red-400 mt-1 px-1">{errors.email.message}</p>}
                      </div>
                      <div>
                        <input
                          {...register("phone")}
                          type="tel"
                          placeholder="WhatsApp number"
                          className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors"
                        />
                        {errors.phone && <p className="text-xs text-red-400 mt-1 px-1">{errors.phone.message}</p>}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gameon-yellow text-gameon-black font-semibold text-sm tracking-wider uppercase rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                        whileTap={{ scale: 0.96 }}
                        transition={spring}
                      >
                        {submitting ? (
                          <span className="w-4 h-4 border-2 border-gameon-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Notify Me
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </motion.button>
                    </form>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}