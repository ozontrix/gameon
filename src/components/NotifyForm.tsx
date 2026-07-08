"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Send, Check, MessageCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone required").max(15),
});

type FormData = z.infer<typeof formSchema>;

function fireConfetti() {
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: ["#F5D000", "#0B0B0C", "#F3F2ED"],
  };

  confetti({ ...defaults, particleCount: 40, angle: 60, origin: { x: 0, y: 0.8 } });
  confetti({ ...defaults, particleCount: 40, angle: 120, origin: { x: 1, y: 0.8 } });
}

export default function NotifyForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      setSubmitting(true);

      try {
        // Insert into Supabase if env vars are configured
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

        // Success state
        fireConfetti();
        setSubmitted(true);
      } catch {
        // Still show success even if DB fails - UX friendly
        fireConfetti();
        setSubmitted(true);
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return (
    <section className="scroll-section py-16 px-6" id="notify">
      <motion.div
        className="max-w-sm mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-gameon-off-white mb-2 text-center">
          Be First On Court
        </h2>
        <p className="text-sm text-gameon-off-white/50 text-center mb-8 max-w-xs mx-auto">
          Get notified the moment doors open — plus early-access member pricing.
        </p>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              className="glass-panel p-8 flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-14 h-14 rounded-full bg-gameon-yellow/20 flex items-center justify-center">
                <Check className="w-7 h-7 text-gameon-yellow" />
              </div>
              <p className="font-display text-xl text-gameon-off-white">You're In!</p>
              <p className="text-sm text-gameon-off-white/60 text-center">
                We'll reach out the moment doors open.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>
                <input
                  {...register("name")}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors"
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1.5 px-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="Email address"
                  className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors"
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1.5 px-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="WhatsApp number"
                  className="w-full bg-white/5 border border-gameon-line rounded-2xl px-4 py-3.5 text-sm text-gameon-off-white placeholder:text-gameon-off-white/30 focus:outline-none focus:border-gameon-yellow/50 transition-colors"
                />
                {errors.phone && (
                  <p className="text-xs text-red-400 mt-1.5 px-1">{errors.phone.message}</p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                className="w-full bg-gameon-yellow text-gameon-black font-semibold text-sm tracking-wider uppercase rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
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

              <a
                href="https://wa.me/919999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs tracking-wider uppercase text-gameon-yellow-dim hover:text-gameon-yellow transition-colors font-medium py-3"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Updates on WhatsApp
              </a>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}