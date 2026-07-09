"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Calendar,
  Users,
  MoreHorizontal,
  MapPin,
  Trophy,
  Building,
  Phone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "hero", label: "Home", icon: Home },
  { id: "sports", label: "Sports", icon: LayoutGrid },
  { id: "booking", label: "Book", icon: Calendar },
  { id: "legacy", label: "Legacy", icon: Trophy },
  { id: "more", label: "More", icon: MoreHorizontal },
];

const desktopSections = [
  { id: "hero", label: "Home" },
  { id: "sports", label: "Sports" },
  { id: "zones", label: "Zones" },
  { id: "legacy", label: "Legacy" },
  { id: "audience", label: "For You" },
  { id: "community", label: "Community" },
  { id: "booking", label: "Book" },
  { id: "location", label: "Location" },
  { id: "more", label: "More" },
];

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

export function Navigation() {
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);

      // Determine active section
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMoreOpen(false);
  };

  const mobileTabs = [
    { id: "hero", icon: Home },
    { id: "sports", icon: LayoutGrid },
    { id: "booking", icon: Calendar },
    { id: "legacy", icon: Trophy },
    { id: "more", icon: MoreHorizontal },
  ];

  return (
    <>
      {/* ─── Desktop Floating Dock ─── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 hidden lg:flex items-center justify-center pt-4 pb-2 pointer-events-none",
          scrolled && "pt-2"
        )}
      >
        <nav
          className={cn(
            "pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-[9999px] transition-all duration-500",
            "glass",
            scrolled
              ? "bg-[rgba(14,17,22,0.75)] backdrop-blur-[20px] saturate-[160%]"
              : "bg-[rgba(14,17,22,0.4)] backdrop-blur-[12px] saturate-[140%]"
          )}
        >
          {desktopSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              className={cn(
                "relative px-3.5 py-2 rounded-full text-xs font-medium tracking-wider uppercase transition-colors",
                activeSection === section.id
                  ? "text-go-white"
                  : "text-go-off/40 hover:text-go-off/70"
              )}
            >
              {activeSection === section.id && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute inset-0 rounded-full bg-go-brand"
                  transition={spring}
                />
              )}
              <span className="relative z-10">{section.label}</span>
            </button>
          ))}
        </nav>
      </motion.header>

      {/* ─── Mobile Floating Top Pill Nav ─── */}
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className={cn(
          "lg:hidden fixed top-0 left-0 right-0 z-50 flex items-start justify-center pt-3 sm:pt-4 pointer-events-none",
          scrolled && "pt-2"
        )}
      >
        <div className={cn(
          "pointer-events-auto flex items-center justify-around px-2 py-1.5 rounded-[9999px] transition-all duration-500",
          "glass",
          "bg-[rgba(14,17,22,0.7)] backdrop-blur-[20px] saturate-[160%]"
        )}>
          {mobileTabs.map(({ id, icon: Icon }) => {
            const isActive = activeSection === id || (id === "more" && mobileMoreOpen);
            return (
              <button
                key={id}
                onClick={() => {
                  if (id === "more") {
                    setMobileMoreOpen(!mobileMoreOpen);
                  } else {
                    scrollTo(id);
                  }
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center w-12 h-10 rounded-full transition-colors",
                  isActive ? "text-go-white" : "text-go-off/40"
                )}
                aria-label={id}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-full bg-go-brand"
                    transition={spring}
                  />
                )}
                <Icon className={cn(
                  "w-4.5 h-4.5 relative z-10 transition-transform",
                  isActive && "scale-110"
                )} />
              </button>
            );
          })}
        </div>
      </motion.nav>

      {/* ─── Mobile "More" Sheet ─── */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMoreOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-16 left-3 right-3 glass rounded-[28px] p-4 safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                {[
                  { id: "zones", label: "Zones", icon: Building },
                  { id: "audience", label: "For You", icon: Users },
                  { id: "community", label: "Community", icon: Sparkles },
                  { id: "location", label: "Location", icon: MapPin },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-go-white-glass transition-colors text-left"
                  >
                    <Icon className="w-5 h-5 text-go-brand" />
                    <span className="text-sm font-medium text-go-off/80">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}