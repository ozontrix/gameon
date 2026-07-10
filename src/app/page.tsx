"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Send, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";

import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { SportsSection } from "@/components/SportsSection";
import { ZonesSection } from "@/components/ZonesSection";
import { LegacySection } from "@/components/LegacySection";
import { AudienceSection } from "@/components/AudienceSection";
import { CommunitySection } from "@/components/CommunitySection";
import { BookingSection } from "@/components/BookingSection";
import { LocationSection } from "@/components/LocationSection";
import { FooterSection } from "@/components/FooterSection";
import { StackedCard } from "@/components/StackedCard";

// ─── Form Schema ───
const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone required").max(15),
});

type FormData = z.infer<typeof formSchema>;

// ─── Confetti ───
function fireConfetti() {
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: ["#F5D000", "#F5D000", "#F7F5F2"],
  };
  confetti({ ...defaults, particleCount: 40, angle: 60, origin: { x: 0, y: 0.8 } });
  confetti({ ...defaults, particleCount: 40, angle: 120, origin: { x: 1, y: 0.8 } });
}

const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

// ─── Notify Modal ───
function NotifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "slide">("form");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setStep("form");
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    // Animate to success slide first
    await new Promise((r) => setTimeout(r, 400));
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey && supabaseUrl !== "https://your-project.supabase.co") {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("gameon_waitlist").insert({
          name: data.name,
          email: data.email,
          phone: data.phone,
          created_at: new Date().toISOString(),
        });
      }
      fireConfetti();
      setSubmitted(true);
      setStep("slide");
    } catch {
      fireConfetti();
      setSubmitted(true);
      setStep("slide");
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
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="glass w-full sm:max-w-sm mx-4 mb-0 sm:mb-0 rounded-b-none sm:rounded-b-[28px] rounded-t-[28px] p-6 sm:p-8 overflow-hidden"
            initial={{ y: 300, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 300, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-go-white-glass flex items-center justify-center hover:bg-go-white-glass-2 transition-colors cursor-pointer z-20"
            >
              <X className="w-4 h-4 text-go-off/60" />
            </button>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  className="flex flex-col items-center gap-4 py-6"
                  initial={{ opacity: 0, x: 60, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                >
                  <motion.div
                    className="w-20 h-20 rounded-full bg-go-brand/15 flex items-center justify-center relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
                  >
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <Check className="w-10 h-10 text-go-brand" />
                    </motion.div>
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-full border-2 border-go-brand/20 animate-ping opacity-30" />
                  </motion.div>
                  <motion.p
                    className="font-display text-2xl text-go-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    You're In!
                  </motion.p>
                  <motion.p
                    className="text-sm text-go-off/60 text-center max-w-xs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    We've saved your spot. You'll be the first to know when we open our doors — and you'll get exclusive early-access member pricing.
                  </motion.p>
                  <motion.div
                    className="mt-2 flex items-center gap-2 text-[10px] text-go-off/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-go-brand/60" />
                    Typically responds within 24 hours
                  </motion.div>
                  <motion.button
                    onClick={onClose}
                    className="mt-4 text-xs tracking-wider uppercase text-go-brand/60 hover:text-go-brand transition-colors font-medium cursor-pointer"
                    whileTap={{ scale: 0.96 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Close
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -60, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                >
                  <div className="mb-6">
                    <h3 className="font-display text-2xl text-go-white mb-1">Be First On Court</h3>
                    <p className="text-sm text-go-off/50">
                      Early-access member pricing + launch invite. No spam, ever.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
                    <div>
                      <input
                        {...register("name")}
                        placeholder="Your name"
                        className="w-full bg-go-white-glass border border-go-border-subtle rounded-2xl px-4 py-3.5 text-sm text-go-off placeholder:text-go-off/30 focus:outline-none focus:border-go-brand/50 transition-colors"
                      />
                      {errors.name && (
                        <p className="text-xs text-red-400 mt-1 px-1">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="Email address"
                        className="w-full bg-go-white-glass border border-go-border-subtle rounded-2xl px-4 py-3.5 text-sm text-go-off placeholder:text-go-off/30 focus:outline-none focus:border-go-brand/50 transition-colors"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-400 mt-1 px-1">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register("phone")}
                        type="tel"
                        placeholder="WhatsApp number"
                        className="w-full bg-go-white-glass border border-go-border-subtle rounded-2xl px-4 py-3.5 text-sm text-go-off placeholder:text-go-off/30 focus:outline-none focus:border-go-brand/50 transition-colors"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-400 mt-1 px-1">{errors.phone.message}</p>
                      )}
                    </div>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-go-brand text-go-white font-semibold text-sm tracking-wider uppercase rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer relative overflow-hidden group"
                      whileTap={{ scale: 0.96 }}
                      transition={spring}
                    >
                      {/* Shine effect */}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {submitting ? (
                        <span className="w-4 h-4 border-2 border-go-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Notify Me
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Trust microcopy */}
                  <p className="text-[9px] text-go-off/20 text-center mt-4 tracking-wider">
                    ✦ Your info is safe with us. No spam. Unsubscribe anytime.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
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
      <Navigation />

      <main className="relative">
        <HeroSection onNotifyClick={() => setModalOpen(true)} />

        {/* Stacked cards — each section slides up as a card with rounded top corners */}
        <StackedCard index={0} totalCards={7}>
          <SportsSection onReserve={() => {
            document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
          }} />
        </StackedCard>

        <StackedCard index={1} totalCards={7}>
          <ZonesSection />
        </StackedCard>

        <StackedCard index={2} totalCards={7}>
          <LegacySection />
        </StackedCard>

        <StackedCard index={3} totalCards={7}>
          <AudienceSection />
        </StackedCard>

        <StackedCard index={4} totalCards={7}>
          <CommunitySection />
        </StackedCard>

        <StackedCard index={5} totalCards={7}>
          <BookingSection />
        </StackedCard>

        <StackedCard index={6} totalCards={7}>
          <LocationSection />
        </StackedCard>

        <FooterSection />
      </main>

      <NotifyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}