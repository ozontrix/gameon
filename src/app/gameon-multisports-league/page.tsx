import type { Metadata } from "next";
import { LeagueLanding } from "@/components/league/landing";

export const metadata: Metadata = {
  title: "Game On Multisports League — Sports, Categories & Fees",
  description:
    "Four sports, eight categories and live slot availability. Badminton from ₹1,000, pickleball from ₹800, box cricket 7v7 and football 6v6 at ₹2,000 per team.",
};

export default function MultisportsLeagueHome() {
  return <LeagueLanding />;
}
