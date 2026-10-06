"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import Image from "next/image";
import {
  Home,
  LayoutGrid,
  Building,
  Calendar,
  Trophy,
  Handshake,
  MapPin,
  ArrowUp,
  Bell,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Every item that can appear in the nav ───
// Items without `href` scroll to a section on the home page.
// Items with `href` open an internal route (e.g. /sponsorship).
type NavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  desc?: string;
  highlighted?: boolean;
};

// ─── All the sections that exist on the site (in page order) ───
const desktopSections: NavItem[] = [
  { id: "hero", label: "Home", icon: Home },
  { id: "sports", label: "Sports", icon: LayoutGrid },
  { id: "zones", label: "Zones", icon: Building },
  { id: "sponsorship", label: "Sponsorships", icon: Handshake, href: "/sponsorship" },
  { id: "blogs", label: "Blogs", icon: BookOpen, href: "/blogs" },
  { id: "league", label: "Game On Multi Sports League", icon: Trophy, href: "/gameon-multisports-league", highlighted: true },
];

// Primary tabs always visible in the mobile bottom bar
type MobileTab = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  image?: string;
  href?: string;
  highlighted?: boolean;
  ariaLabel?: string;
};

const mobileTabs: MobileTab[] = [
  { id: "hero", label: "Home", icon: Home },
  { id: "sports", label: "Sports", icon: LayoutGrid },
  { id: "zones", label: "Zones", icon: Building },
  { id: "league", label: "GML", icon: Trophy, href: "/gameon-multisports-league", highlighted: true, ariaLabel: "Game On Multi Sports League" },
  { id: "more", label: "More", image: "/game_on_favicon.png" },
];

// Secondary items tucked behind the "More" sheet
const moreItems: NavItem[] = [
  { id: "sponsorship", label: "Sponsorships", icon: Handshake, href: "/sponsorship", desc: "Partner your brand with Game On" },
  { id: "blogs", label: "Blogs", icon: BookOpen, href: "/blogs", desc: "Sports guides and stories from the court" },
  { id: "booking", label: "Book", icon: Calendar, desc: "Reserve your next game" },
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

  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // The nav item that owns the current route (e.g. "Sponsorship" on /sponsorship)
  const routeSection = desktopSections.find((s) => s.href && (s.href === pathname || pathname.startsWith(`${s.href}/`)));
  const currentSection = routeSection?.id ?? (onHome ? activeSection : "");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
      setShowBackToTop(window.scrollY > 600);

      // Inner-page active states are derived directly from the route.
      if (!onHome) return;

      // Otherwise determine the active section by scroll position
      const sections = [...desktopSections, ...moreItems].filter((s) => !s.href).map((s) => s.id);
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
  }, [onHome]);

  // Coming back from an inner page (e.g. /#sports) — land on the section asked for
  useEffect(() => {
    if (!onHome) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const timer = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);

    return () => clearTimeout(timer);
  }, [onHome, pathname]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Section links scroll on the home page and navigate back to it from inner pages
  const goTo = useCallback(
    (id: string) => {
      setMobileMoreOpen(false);

      if (!onHome) {
        router.push(id === "hero" ? "/" : `/#${id}`);
        return;
      }

      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [onHome, router]
  );

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
            aria-label="Primary desktop"
            className={cn(
              "flex items-center justify-between gap-4 rounded-full py-2 pl-5 pr-2 border border-white/[0.06] transition-all duration-500",
              scrolled
                ? "bg-[rgba(14,17,22,0.85)] backdrop-blur-[20px] saturate-[160%] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                : "bg-[rgba(14,17,22,0.85)] backdrop-blur-[12px] saturate-[140%]"
            )}
          >
            {/* Brand */}
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 cursor-pointer group"
              aria-label="Game On — go to home"
            >
              <span className="text-base font-display font-bold tracking-tight text-go-white transition-colors group-hover:text-go-off">
                GAME<span className="text-go-brand">ON</span>
              </span>
              <span className="hidden 2xl:block text-[9px] uppercase tracking-[0.22em] text-go-off/60 font-medium pt-0.5">
                Where the City Unplugs
              </span>
            </Link>

            {/* Section links */}
            <div className="flex items-center gap-0.5">
              {desktopSections.map((section) => {
                const isActive = currentSection === section.id;
                const itemClass = cn(
                  "relative flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 xl:px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer",
                  section.highlighted
                    ? "bg-go-brand text-go-black shadow-[0_0_20px_rgba(243,143,47,0.2)] hover:bg-go-brand/90"
                    : isActive ? "text-go-black" : "text-go-off/75 hover:text-go-white"
                );
                const itemContent = (
                  <>
                    {isActive && !section.highlighted && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-go-brand"
                        transition={spring}
                      />
                    )}
                    <section.icon
                      className={cn(
                        "w-3.5 h-3.5 relative z-10 transition-transform",
                        isActive || section.highlighted ? "text-go-black" : "text-go-brand",
                        isActive && "scale-110"
                      )}
                    />
                    <span className="relative z-10">{section.label}</span>
                  </>
                );

                // Route items (e.g. Sponsorship) open a page; section items scroll
                return section.href ? (
                  <Link
                    key={section.id}
                    href={section.href}
                    aria-current={isActive ? "page" : undefined}
                    className={itemClass}
                  >
                    {itemContent}
                  </Link>
                ) : (
                  <Link
                    key={section.id}
                    href={section.id === 'hero' ? '/' : `/#${section.id}`}
                    aria-current={isActive ? "location" : undefined}
                    className={itemClass}
                  >
                    {itemContent}
                  </Link>
                );
              })}
            </div>

            {/* CTA */}
            {onNotifyClick && (
              <button
                onClick={onNotifyClick}
                className="shrink-0 flex items-center gap-2 bg-go-brand text-go-black text-[11px] font-bold tracking-wider uppercase rounded-full px-4 py-2 transition-all duration-300 hover:shadow-[0_0_28px_rgba(243,143,47,0.4)] hover:scale-[1.03] cursor-pointer"
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
            {mobileTabs.map(({ id, label, icon: Icon, image, href, highlighted, ariaLabel }) => {
              const isActive = currentSection === id || (id === "more" && (mobileMoreOpen || moreItems.some((item) => item.id === currentSection)));
              const itemClass = cn(
                "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-colors cursor-pointer select-none",
                highlighted
                  ? "bg-go-brand text-go-black shadow-[0_0_18px_rgba(243,143,47,0.25)] hover:bg-go-brand/90"
                  : isActive ? "text-go-brand" : "text-go-off/75 hover:text-go-white active:text-go-white"
              );
              const itemContent = (
                <>
                  {isActive && !highlighted && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute inset-0 rounded-2xl bg-go-brand/15 border border-go-brand/20"
                      transition={spring}
                    />
                  )}
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      width={150}
                      height={150}
                      className={cn("w-5 h-5 relative z-10 object-contain transition-transform", isActive && "scale-110")}
                    />
                  ) : (
                    Icon && <Icon className={cn("w-5 h-5 relative z-10 transition-transform", isActive && "scale-110")} />
                  )}
                  <span className="relative z-10 text-[9px] font-semibold uppercase tracking-wider">{label}</span>
                </>
              );
              return id === "more" ? (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMobileMoreOpen((v) => !v)}
                  className={itemClass}
                  aria-label={label}
                  aria-expanded={mobileMoreOpen}
                  aria-controls="mobile-more-menu"
                >
                  {itemContent}
                </button>
              ) : (
                <Link
                  key={id}
                  href={href ?? (id === "hero" ? "/" : `/#${id}`)}
                  onClick={closeMore}
                  className={itemClass}
                  aria-label={ariaLabel ?? label}
                  aria-current={isActive ? (href ? "page" : "location") : undefined}
                >
                  {itemContent}
                </Link>
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
              id="mobile-more-menu"
              aria-label="More sections"
            >
              {/* Grab handle */}
              <div className="mx-auto mb-3 w-10 h-1 rounded-full bg-go-off/20" />

              <p className="text-[10px] tracking-[0.2em] uppercase text-go-off/30 font-medium px-1 mb-2">
                Explore More
              </p>

              <div className="flex flex-col gap-1">
                {moreItems.map(({ id, label, icon: Icon, desc, href }) => {
                  const isActive = currentSection === id;
                  const itemClass = cn(
                    "flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-go-white-glass transition-colors text-left cursor-pointer",
                    isActive && "bg-go-brand/10"
                  );
                  const itemContent = (
                    <>
                      <span className="w-9 h-9 rounded-xl bg-go-brand/10 border border-go-brand/15 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-go-brand" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-go-off/80">{label}</span>
                        {desc && <span className="block text-[10px] text-go-off/65 mt-0.5">{desc}</span>}
                      </span>
                    </>
                  );

                  // Route items (e.g. Sponsorship) open a page; section items scroll
                  return href ? (
                    <Link key={id} href={href} onClick={closeMore} className={itemClass} aria-current={isActive ? "page" : undefined}>
                      {itemContent}
                    </Link>
                  ) : (
                    <button key={id} onClick={() => goTo(id)} className={itemClass}>
                      {itemContent}
                    </button>
                  );
                })}
              </div>

              {onNotifyClick && (
                <button
                  onClick={() => {
                    closeMore();
                    onNotifyClick();
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-go-brand text-go-black text-xs font-bold tracking-wider uppercase rounded-2xl py-3.5 hover:shadow-[0_0_24px_rgba(243,143,47,0.35)] transition-all cursor-pointer"
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
