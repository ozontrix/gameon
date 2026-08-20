"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Building,
  Calendar,
  Users,
  Sparkles,
  MapPin,
  MoreHorizontal,
  ArrowUp,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── All the sections that exist on the site (in page order) ───
const desktopSections = [
  { id: "hero", label: "Home", icon: Home },
  { id: "sports", label: "Sports", icon: LayoutGrid },
  { id: "zones", label: "Zones", icon: Building },
  { id: "audience", label: "For You", icon: Users },
  { id: "community", label: "Community", icon: Sparkles },
  { id: "booking", label: "Book", icon: Calendar },
  { id: "location", label: "Location", icon: MapPin },
];

// Primary tabs always visible in the mobile bottom bar
const mobileTabs = [
  { id: "hero", label: "Home", icon: Home },
  { id: "sports", label: "Sports", icon: LayoutGrid },
  { id: "zones", label: "Zones", icon: Building },
  { id: "booking", label: "Book", icon: Calendar },
  { id: "more", label: "More", icon: MoreHorizontal },
];

// Secondary sections tucked behind the "More" sheet
const moreItems = [
  { id: "audience", label: "For You", icon: Users, desc: "Built for every kind of player" },
  { id: "community", label: "Community", icon: Sparkles, desc: "Real moments from Game On" },
  { id: "location", label: "Location", icon: MapPin, desc: "Sector 70, Gurugram" },
];

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

interface NavigationProps {
  onNotifyClick?: () => void;
}

export function Navigation({ onNotifyClick }: NavigationProps) {
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
      setShowBackToTop(window.scrollY > 600);

      // Determine the active section by scroll position
      const sections = desktopSections.map((s) => s.id);
      const scrollPos = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && scrollPos >= el.offsetTop) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollTo = (id: string) => {
    setMobileMoreOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const closeMore = useCallback(() => setMobileMoreOpen(false), []);

  return (
    <>
      {/* ─── Scroll Progress Bar ─── */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[90] h-0.5 origin-left"
        style={{ scaleX, background: "linear-gradient(90deg, var(--go-brand), color-mix(in srgb, var(--go-brand) 40%, transparent))" }}
      />

      {/* ─── Back to Top Button (sits above the mobile bottom bar) ─── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 lg:bottom-6 right-4 sm:right-6 z-[80] w-11 h-11 rounded-full glass flex items-center justify-center cursor-pointer hover:bg-go-white-glass-2 transition-colors group"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4.5 h-4.5 text-go-off/60 group-hover:text-go-brand transition-colors" />
            <span className="absolute inset-0 rounded-full border border-go-brand/20 animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Desktop Floating Header ─── */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[80] hidden lg:block transition-all duration-500",
          scrolled ? "pt-2" : "pt-4"
        )}
      >
        <div className="mx-auto max-w-[1400px] px-4 xl:px-6">
          <nav
            className={cn(
              "flex items-center justify-between gap-4 rounded-full py-2 pl-5 pr-2 border border-white/[0.06] transition-all duration-500",
              scrolled
                ? "bg-[rgba(14,17,22,0.85)] backdrop-blur-[20px] saturate-[160%] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                : "bg-[rgba(14,17,22,0.4)] backdrop-blur-[12px] saturate-[140%]"
            )}
          >
            {/* Brand */}
            <button
              onClick={() => scrollTo("hero")}
              className="flex items-center gap-2 shrink-0 cursor-pointer group"
              aria-label="Game On — go to home"
            >
              <span className="text-base font-display font-bold tracking-tight text-go-white transition-colors group-hover:text-go-off">
                GAME<span className="text-go-brand">ON</span>
              </span>
              <span className="hidden xl:block text-[9px] uppercase tracking-[0.22em] text-go-off/30 font-medium pt-0.5">
                Where the City Unplugs
              </span>
            </button>

            {/* Section links */}
            <div className="flex items-center gap-0.5">
              {desktopSections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer",
                      isActive ? "text-go-black" : "text-go-off/50 hover:text-go-white"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-go-brand"
                        transition={spring}
                      />
                    )}
                    <section.icon
                      className={cn(
                        "w-3.5 h-3.5 relative z-10 transition-transform",
                        isActive ? "text-go-black" : "text-go-brand/70",
                        isActive && "scale-110"
                      )}
                    />
                    <span className="relative z-10">{section.label}</span>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            {onNotifyClick && (
              <button
                onClick={onNotifyClick}
                className="shrink-0 flex items-center gap-2 bg-go-brand text-go-black text-[11px] font-bold tracking-wider uppercase rounded-full px-4 py-2 transition-all duration-300 hover:shadow-[0_0_28px_rgba(245,166,35,0.4)] hover:scale-[1.03] cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Get Early Access</span>
                <span className="xl:hidden">Notify</span>
              </button>
            )}
          </nav>
        </div>
      </motion.header>

      {/* ─── Mobile Sticky Bottom Bar ─── */}
      <motion.nav
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] pointer-events-none"
        aria-label="Primary"
      >
        <div className="pointer-events-auto mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
          <div className="flex items-center justify-between gap-0.5 rounded-[28px] border border-white/[0.08] bg-[rgba(14,17,22,0.82)] backdrop-blur-[24px] saturate-[160%] px-2 py-1.5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {mobileTabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id || (id === "more" && mobileMoreOpen);
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (id === "more") setMobileMoreOpen((v) => !v);
                    else scrollTo(id);
                  }}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-colors cursor-pointer select-none",
                    isActive ? "text-go-brand" : "text-go-off/40 active:text-go-off/70"
                  )}
                  aria-label={label}
                  aria-expanded={id === "more" ? mobileMoreOpen : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute inset-0 rounded-2xl bg-go-brand/15 border border-go-brand/20"
                      transition={spring}
                    />
                  )}
                  <Icon className={cn("w-5 h-5 relative z-10 transition-transform", isActive && "scale-110")} />
                  <span className="relative z-10 text-[9px] font-semibold uppercase tracking-wider">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.nav>

      {/* ─── Mobile "More" Bottom Sheet ─── */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={closeMore}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed left-3 right-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-[90] lg:hidden rounded-[28px] border border-white/[0.08] bg-[rgba(14,17,22,0.92)] backdrop-blur-[24px] saturate-[160%] p-4 pb-5 shadow-2xl"
              role="dialog"
              aria-label="More sections"
            >
              {/* Grab handle */}
              <div className="mx-auto mb-3 w-10 h-1 rounded-full bg-go-off/20" />

              <p className="text-[10px] tracking-[0.2em] uppercase text-go-off/30 font-medium px-1 mb-2">
                Explore More
              </p>

              <div className="flex flex-col gap-1">
                {moreItems.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-go-white-glass transition-colors text-left cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-xl bg-go-brand/10 border border-go-brand/15 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-go-brand" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-go-off/80">{label}</span>
                      {desc && <span className="block text-[10px] text-go-off/40 mt-0.5">{desc}</span>}
                    </span>
                  </button>
                ))}
              </div>

              {onNotifyClick && (
                <button
                  onClick={() => {
                    closeMore();
                    onNotifyClick();
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-go-brand text-go-black text-xs font-bold tracking-wider uppercase rounded-2xl py-3.5 hover:shadow-[0_0_24px_rgba(245,166,35,0.35)] transition-all cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  Get Early Access
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
