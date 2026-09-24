"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { NotifyModal } from "@/components/NotifyModal";
import { SponsorshipGallery } from "@/components/SponsorshipGallery";
import { FooterSection } from "@/components/FooterSection";

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };

// ─── Sponsorship page — the sponsorship deck, one card per slide ───
export function SponsorshipPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Navigation onNotifyClick={() => setModalOpen(true)} />

      <main className="relative min-h-screen pt-6 lg:pt-36">
        {/* ─── Page intro — sits in a dark card like the rest of the site ─── */}
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-6xl px-3 pb-6 sm:px-4 lg:px-5 lg:pb-14"
        >
          <div
            className="relative overflow-hidden rounded-[28px] border border-white/[0.08] px-5 py-8 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.95)] sm:px-6 sm:py-10 lg:px-8 lg:py-14"
            style={{
              background:
                "linear-gradient(170deg, #0E0E18 0%, #0A0A12 30%, #080810 60%, #06060A 100%)",
            }}
          >
            {/* Brand accent line along the top edge */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, var(--go-brand) 0%, color-mix(in srgb, var(--go-brand) 60%, transparent) 45%, transparent 100%)",
              }}
            />

            {/* Soft brand glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full blur-[90px]"
              style={{ background: "color-mix(in srgb, var(--go-brand) 10%, transparent)" }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-72 rounded-full blur-[100px]"
              style={{ background: "color-mix(in srgb, var(--go-brand) 6%, transparent)" }}
            />

            <div className="relative">
              <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">
                Partner With Game On
              </span>
              <h1 className="mt-3 text-4xl lg:text-6xl font-display font-bold text-go-white">
                Sponsorship
              </h1>
              <p className="mt-4 max-w-2xl text-sm lg:text-base text-go-off/50 leading-relaxed">
                Put your brand at the heart of Gurugram&apos;s premium multi-sports destination —
                courtside visibility, a highly engaged community, and a launch platform built for
                reach. Browse the deck below.
              </p>
              <motion.a
                href="mailto:info@gameonmultisports.com?subject=Sponsorship%20enquiry"
                className="mt-6 inline-flex items-center gap-2 bg-go-brand text-go-black text-[11px] font-bold tracking-wider uppercase rounded-full px-5 py-3 transition-all duration-300 hover:shadow-[0_0_28px_rgba(243,143,47,0.4)] hover:scale-[1.03] cursor-pointer"
                whileTap={{ scale: 0.96 }}
                transition={spring}
              >
                <Mail className="w-3.5 h-3.5" />
                Talk to us
              </motion.a>
            </div>
          </div>
        </motion.header>

        {/* ─── Cards — one per slide, in serial order ─── */}
        <SponsorshipGallery />
      </main>

      <FooterSection />

      <NotifyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
