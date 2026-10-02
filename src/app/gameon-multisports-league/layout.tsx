import type { Metadata } from "next";
import { LeagueBookingProvider } from "@/components/league/booking-context";

/**
 * Game On Multisports League — standalone landing flow.
 *
 * Intentionally chrome-free: no sticky brand header, no bottom tab bar and no
 * footer. Each screen carries its own inline content and a sticky action bar,
 * so the whole flow reads as a single landing page a walk-in can book from.
 *
 * The league screens use their own booking state and components.
 * Landing and category components live in `src/components/league/`.
 */

export const metadata: Metadata = {
  title: {
    default: "Game On Multisports League — Book Your Slot",
    template: "%s | Game On Multisports League",
  },
  description:
    "Register for Game On Multisports League on 17 & 18 October 2026 at Sector 70, Gurugram. Badminton, pickleball, box cricket 7v7 and football 6v6 with a ₹3 lakh+ overall prize pool. Check each category's date and entry fee.",
  openGraph: {
    title: "Game On Multisports League",
    description:
      "17 & 18 October 2026 · 4 sports · 14 categories · ₹3 lakh+ overall prize pool. Choose your categories, check match dates and register.",
    siteName: "Game On",
    locale: "en_IN",
    type: "website",
  },
};

export default function MultisportsLeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <LeagueBookingProvider>
      <div className="relative min-h-dvh bg-go-black">
        {/* Ambient brand glow — the only decoration this flow shares with the app */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(243,143,47,0.13) 0%, rgba(11,11,12,0) 62%)",
          }}
        />

        <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-36 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>
    </LeagueBookingProvider>
  );
}
