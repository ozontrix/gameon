"use client";

import { useRef, useState, type ComponentType, type FormEvent } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Heart,
  Shield,
  MessageCircle,
  Sparkles,
  Send,
  Check,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { FaInstagram } from "react-icons/fa";

type FooterLink = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  desc?: string;
  comingSoon?: boolean;
};

const settingsRows: FooterLink[][] = [
  [
    { label: "Contact Us", icon: Mail, href: "mailto:info@gameonmultisports.com", desc: "We respond within 4 hours" },
    { label: "Call Us", icon: Phone, href: "tel:+919034844654", desc: "Mon–Sat, 9 AM – 8 PM" },
  ],
  [
    { label: "WhatsApp", icon: MessageCircle, href: "https://wa.me/919034844654", desc: "Quickest way to reach us" },
    { label: "Partnerships", icon: Building2, desc: "Brands, sponsors, events", comingSoon: true },
  ],
  [
    { label: "Careers", icon: Briefcase, desc: "Join the Game On team", comingSoon: true },
    { label: "Terms of Use", icon: Shield, href: "/terms", desc: "Policies & guidelines" },
  ],
  [
    { label: "Privacy Policy", icon: Heart, href: "/privacy", desc: "How we handle your data" },
  ],
];

// ─── Newsletter confetti ───
function fireNewsletterConfetti() {
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: ["#F5A623", "#F5D000", "#F7F5F2"],
  };
  confetti({ ...defaults, particleCount: 40, angle: 60, origin: { x: 0, y: 0.8 } });
  confetti({ ...defaults, particleCount: 40, angle: 120, origin: { x: 1, y: 0.8 } });
}

// Re-used for the invalid-email shake
const shakeAnimation = { x: [0, -8, 8, -5, 5, 0] };

export function FooterSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [emailFocused, setEmailFocused] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "error" | "success">("idle");
  const [submitting, setSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || newsletterStatus === "success") return;

    const email = newsletterEmail.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      setNewsletterStatus("error");
      return;
    }

    setSubmitting(true);
    setNewsletterStatus("idle");

    try {
      // Give the spinner a brief moment, then send the notification email
      const [res] = await Promise.all([
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "newsletter", email }),
        }),
        new Promise((r) => setTimeout(r, 700)),
      ]);

      if (!res.ok) {
        toast.error("Couldn't subscribe right now. Please try again.");
        return;
      }

      setNewsletterEmail("");
      setNewsletterStatus("success");
      fireNewsletterConfetti();
    } catch {
      toast.error("Couldn't subscribe right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="more" ref={ref} className="relative">
      {/* Full-bleed navy panel */}
      <div className="bg-go-navy">
        <div className="px-6 sm:px-8 lg:px-14 xl:px-20 py-16 lg:py-20">
          <motion.div
            className="mb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div>
              <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">More</span>
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
                Game On
              </h2>
            </div>

            {/* Newsletter / Waitlist mini */}
            <div className="w-full lg:max-w-sm">
              <p className="text-[10px] tracking-wider uppercase text-go-off/30 font-medium mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-go-brand" />
                Stay in the loop
              </p>

              <AnimatePresence mode="wait" initial={false}>
                {newsletterStatus === "success" ? (
                  /* ─── Success state ─── */
                  <motion.div
                    key="success"
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-go-brand/25 bg-go-brand/10"
                  >
                    <motion.div
                      className="relative shrink-0 w-10 h-10 rounded-full bg-go-brand/15 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 16, delay: 0.05 }}
                    >
                      <motion.span
                        className="flex"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.15 }}
                      >
                        <Check className="w-5 h-5 text-go-brand" strokeWidth={3} />
                      </motion.span>
                      <span className="absolute inset-0 rounded-full border-2 border-go-brand/25 animate-ping opacity-40" />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-go-white">You&apos;re in! 🎉</p>
                      <p className="text-[10px] text-go-off/40 mt-0.5">
                        We&apos;ll ping you the moment we open our doors.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  /* ─── Form state ─── */
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleNewsletterSubmit}
                    noValidate
                  >
                    <motion.div
                      animate={newsletterStatus === "error" ? shakeAnimation : { x: 0 }}
                      transition={{ duration: 0.45, ease: "easeInOut" }}
                      className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-300 border ${
                        newsletterStatus === "error"
                          ? "border-red-400/60 bg-red-400/5"
                          : emailFocused
                          ? "border-go-brand/40 bg-go-brand/5"
                          : "border-go-border-subtle bg-go-white-glass"
                      }`}
                    >
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={(e) => {
                          setNewsletterEmail(e.target.value);
                          if (newsletterStatus === "error") setNewsletterStatus("idle");
                        }}
                        placeholder="Enter your email"
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        disabled={submitting}
                        aria-label="Email for newsletter"
                        aria-invalid={newsletterStatus === "error"}
                        className="flex-1 bg-transparent text-xs text-go-off/80 placeholder:text-go-off/30 px-3 py-2 focus:outline-none disabled:opacity-60"
                      />
                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.9 }}
                        disabled={submitting}
                        aria-label="Subscribe to newsletter"
                        className="shrink-0 w-8 h-8 rounded-full bg-go-brand flex items-center justify-center hover:bg-go-brand/90 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                      >
                        {submitting ? (
                          <Loader2 className="w-3.5 h-3.5 text-go-black animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-go-black" />
                        )}
                      </motion.button>
                    </motion.div>

                    <AnimatePresence>
                      {newsletterStatus === "error" && (
                        <motion.p
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-[10px] text-red-400 mt-1.5 px-1"
                        >
                          Please enter a valid email address
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="text-[9px] text-go-off/30 mt-1.5 px-1">
                Be the first to know about launches & offers
              </p>
            </div>
          </motion.div>

          {/* iOS-style grouped list */}
          <motion.div
            className="space-y-3 max-w-lg"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {settingsRows.map((group, gi) => (
              <div key={gi} className="glass-navy rounded-[20px] overflow-hidden divide-y divide-go-border-subtle/50">
                {group.map((item) => {
                  const content = (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-go-brand" />
                        <div>
                          <span className="text-sm font-medium text-go-off/80">{item.label}</span>
                          {item.desc && (
                            <p className="text-[10px] text-go-off/30 mt-0.5">{item.desc}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-go-off/30 group-hover:text-go-off/50 transition-colors" />
                    </>
                  );

                  if (item.comingSoon) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          toast("Coming Soon", {
                            description: `${item.label} is on its way — stay tuned!`,
                          })
                        }
                        className="flex w-full items-center justify-between px-5 py-4 hover:bg-go-white-glass transition-colors group text-left cursor-pointer"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center justify-between px-5 py-4 hover:bg-go-white-glass transition-colors group"
                    >
                      {content}
                    </a>
                  );
                })}
              </div>
            ))}
          </motion.div>

          {/* Social & Brand */}
          <motion.div
            className="mt-12 pt-8 border-t border-go-border-subtle/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Logo */}
            <div className="w-32">
              <Image
                src="/game_on.png"
                alt="Game On"
                width={160}
                height={48}
                className="object-contain w-full h-auto opacity-80"
              />
            </div>

            {/* Social with hover tooltip */}
            <div className="flex items-center gap-4">
              {[
                { icon: FaInstagram, href: "https://www.instagram.com/gameonmultisports", label: "Instagram", handle: "@gameonmultisports" },
              ].map(({ icon: Icon, href, label, handle }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-10 h-10 rounded-full bg-go-white-glass flex items-center justify-center hover:bg-go-white-glass-2 transition-all duration-300 hover:scale-110"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-go-off/60 group-hover:text-go-brand transition-colors" />
                  {/* Tooltip */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-go-black text-[9px] text-go-off/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none backdrop-blur-sm border border-go-border-subtle">
                    {handle}
                  </span>
                </a>
              ))}
            </div>

            <p className="text-xs text-go-off/30">
              © {new Date().getFullYear()} Game On Multisports Complex. All rights reserved.
            </p>
          </motion.div>

          {/* Bottom tagline */}
          <motion.p
            className="text-[9px] text-go-off/20 text-center mt-8 tracking-wider uppercase"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            Built for the love of the game.
          </motion.p>
        </div>
      </div>

      {/* Bottom safe area spacer for mobile tab bar */}
      <div className="h-24 lg:h-0 bg-go-navy" />
    </section>
  );
}
