"use client";

/**
 * Game On Olympics — native-app shell.
 *
 * One chrome for every screen in the flow: brand header with the venue
 * location and notification bell on top, a five-tab bar at the bottom on
 * mobile, and an inline nav + footer on desktop. The tab bar steps aside
 * during checkout so the sticky action bar has the bottom of the screen.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Bell,
  CalendarDays,
  Dumbbell,
  Home,
  MapPin,
  Power,
  Trophy,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OlympicsBookingProvider } from "./booking-context";

const BASE = "/gameon-olympics";

const TABS = [
  { href: BASE, label: "Home", icon: Home, exact: true },
  { href: `${BASE}/sports`, label: "Sports", icon: Dumbbell, exact: false },
  { href: `${BASE}/bookings`, label: "My Bookings", icon: CalendarDays, exact: false },
  { href: `${BASE}/events`, label: "Events", icon: Trophy, exact: false },
  { href: `${BASE}/account`, label: "Account", icon: User, exact: false },
];

export function OlympicsAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Focused screens (checkout and sport detail) keep the bottom of the screen
  // for the sticky action bar, so the tab bar steps aside.
  const isFocused =
    pathname.startsWith(`${BASE}/book/`) || /^\/gameon-olympics\/sports\/.+/.test(pathname);

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <OlympicsBookingProvider>
      <div className="relative flex min-h-dvh flex-col bg-go-black">
        {/* Ambient brand glow so the dark shell never reads as flat black */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(242,130,24,0.13) 0%, rgba(11,11,12,0) 62%)",
          }}
        />

        {/* ─── Header ─── */}
        <header className="safe-top sticky top-0 z-40 border-b border-white/[0.06] bg-go-black/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
            <Link href={BASE} className="flex items-center gap-2" aria-label="Game On Olympics home">
              <Image
                src="/game_on_favicon.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg object-contain"
              />
              <span className="flex items-center font-display text-xl leading-none tracking-wide text-go-white">
                GAME
                <Power className="mx-[1px] h-[17px] w-[17px] text-go-brand" strokeWidth={3} />
                N
              </span>
              <span className="hidden rounded-full bg-go-brand px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-go-black sm:inline-block">
                Olympics
              </span>
            </Link>

            <span className="ml-1 hidden items-center gap-1.5 text-[11px] text-go-off/50 md:flex">
              <MapPin className="h-3.5 w-3.5 text-go-brand/70" />
              123 Sports Avenue, Sector 70
            </span>

            <div className="flex-1" />

            <nav className="hidden items-center gap-1 lg:flex">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive(tab)
                      ? "bg-go-brand/15 text-go-brand"
                      : "text-go-off/55 hover:bg-white/[0.05] hover:text-go-white"
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-go-off/70 transition-colors hover:text-go-white active:scale-95"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-go-brand" />
            </button>
          </div>
        </header>

        {/* ─── Screen ─── */}
        <main
          className={cn(
            "relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pt-5 lg:px-6",
            isFocused ? "pb-36 lg:pb-10" : "pb-28 lg:pb-12"
          )}
        >
          {children}
        </main>

        {/* ─── Desktop footer ─── */}
        <footer className="relative z-10 hidden border-t border-white/[0.06] px-6 py-6 lg:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between text-xs text-go-off/35">
            <span>© {new Date().getFullYear()} Game On Multi Sports · Sector 70, Gurugram</span>
            <div className="flex items-center gap-4">
              <Link href="/" className="transition-colors hover:text-go-brand">
                Main site
              </Link>
              <Link href="/terms" className="transition-colors hover:text-go-brand">
                Terms
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-go-brand">
                Privacy
              </Link>
              <Link href="/sponsorship" className="transition-colors hover:text-go-brand">
                Sponsorship
              </Link>
            </div>
          </div>
        </footer>

        {/* ─── Mobile tab bar ─── */}
        {!isFocused ? (
          <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
            <div className="mx-2 mb-2 flex items-center justify-between rounded-[24px] border border-white/10 bg-go-navy/85 px-1.5 py-2 backdrop-blur-2xl">
              {TABS.map((tab) => {
                const active = isActive(tab);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-[18px] px-1 py-1.5 transition-colors",
                      active ? "text-go-brand" : "text-go-off/45"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[9.5px] font-medium tracking-tight">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </OlympicsBookingProvider>
  );
}
