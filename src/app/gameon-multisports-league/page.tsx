import type { Metadata } from "next";
import { LeagueLanding } from "@/components/league/landing";

export const metadata: Metadata = {
  title: "Game On Multisports League — Sports, Categories & Fees",
  description:
    "17 & 18 October 2026 · 4 sports · 14 categories · ₹3 lakh+ overall prize pool. Badminton singles ₹1,000/person and doubles ₹2,000/team. Pickleball from ₹800; box cricket 7v7 and football 6v6 ₹2,000/team. Check every category's match date before registering.",
};

export default function MultisportsLeagueHome() {
  return <LeagueLanding />;
}
