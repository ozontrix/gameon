"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Bell, MapPin, X, Send, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import Image from "next/image";

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

// ─── Animated Counter ───
function AnimatedCounter({ from = 0, to, suffix = "" }: { from?: number; to: number; suffix?: string }) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 30;
    const increment = (to - from) / steps;
    const interval = 1500 / steps;
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

// ─── App Content ───
function AppContent({ onNotifyOpen }: { onNotifyOpen: () => void }) {
  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 sm:px-8 py-16 overflow-hidden">
      {/* Floodlight glow */}
      <div className="floodlight-glow top-1/3 left-1/2 -translate-x-1/2" />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center gap-5 sm:gap-6 w-full max-w-lg mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        >
          <Image
            src="/game_on.png"
            alt="Game On"
            width={320}
            height={96}
            priority
            className="object-contain w-auto h-auto"
            style={{ maxWidth: "320px", height: "auto" }}
          />
        </motion.div>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.25 }}
          className="glass-panel px-5 py-2 rounded-full"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-gameon-yellow animate-pulse" />
            <span className="text-xs tracking-[0.15em] uppercase text-gameon-yellow-dim font-medium">
              Coming Soon
            </span>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 }}
          className="text-sm md:text-base text-gameon-off-white/50 font-medium tracking-wide text-center max-w-xs"
        >
          India's premium multi-sports destination
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.55 }}
          className="flex items-center gap-8 md:gap-12 mt-1"
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
            <AnimatedCounter to={1} />
            <span className="text-[10px] uppercase tracking-[0.15em] text-gameon-yellow-dim">Address</span>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.7 }}
          className="flex items-center gap-2"
        >
          <MapPin className="w-3.5 h-3.5 text-gameon-yellow-dim" />
          <span className="text-xs tracking-wider text-gameon-yellow-dim/70 font-medium">
            Sector 70, Gurugram
          </span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.85 }}
          className="w-full max-w-xs mt-1"
        >
          <motion.button
            onClick={onNotifyOpen}
            className="w-full bg-gameon-yellow text-gameon-black font-semibold text-sm tracking-wider uppercase rounded-full py-4 flex items-center justify-center gap-2 shadow-lg shadow-gameon-yellow/20 cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
          >
            <Bell className="w-4 h-4" />
            Notify Me
          </motion.button>
        </motion.div>

      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-3 mt-auto pt-12"
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
    </div>
  );
}

// ─── Notify Modal ───
function NotifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      reset();
    }
  }, [open, reset]);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="glass-panel w-full sm:max-w-sm mx-4 mb-0 sm:mb-0 rounded-b-none sm:rounded-b-[28px] rounded-t-[28px] p-6 sm:p-8"
            initial={{ y: 300, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 300, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
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
                  onClick={onClose}
                  className="mt-4 text-xs tracking-wider uppercase text-gameon-yellow-dim hover:text-gameon-yellow transition-colors font-medium cursor-pointer"
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
                    <input {...register("name")} placeholder="Your name" className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors" />
                    {errors.name && <p className="text-xs text-red-400 mt-1 px-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <input {...register("email")} type="email" placeholder="Email address" className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors" />
                    {errors.email && <p className="text-xs text-red-400 mt-1 px-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <input {...register("phone")} type="tel" placeholder="WhatsApp number" className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors" />
                    {errors.phone && <p className="text-xs text-red-400 mt-1 px-1">{errors.phone.message}</p>}
                  </div>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gameon-yellow text-gameon-black font-semibold text-sm tracking-wider uppercase rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-gameon-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> Notify Me</>
                    )}
                  </motion.button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ───
export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* ─── Single Responsive Layout ─── */}
      <div className="min-h-screen bg-gameon-black flex flex-col">
        <AppContent onNotifyOpen={() => setModalOpen(true)} />
      </div>

      {/* Modal (shared) */}
      <NotifyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}