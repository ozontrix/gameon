import type { Metadata } from "next";
import { OlympicsAppShell } from "@/components/olympics/app-shell";

export const metadata: Metadata = {
  title: {
    default: "Game On Olympics — Book Your Slot | GAME ON",
    template: "%s | Game On Olympics",
  },
  description:
    "Game On Olympics at Sector 70, Gurugram — badminton, pickleball, box cricket 7v7 and football 6v6. Pick a category, lock a slot and pay online in under two minutes.",
  openGraph: {
    title: "Game On Olympics — 4 Sports. One Arena.",
    description:
      "Register for badminton, pickleball, box cricket and football brackets. 204 player entries, trophies, medals and jerseys to win.",
    siteName: "Game On",
    locale: "en_IN",
    type: "website",
  },
};

export default function GameOnOlympicsLayout({ children }: { children: React.ReactNode }) {
  return <OlympicsAppShell>{children}</OlympicsAppShell>;
}
