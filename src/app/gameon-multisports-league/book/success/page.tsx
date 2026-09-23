import type { Metadata } from "next";
import { LeagueConfirmationScreen } from "@/components/league/confirmation-screen";

/**
 * Shown once Razorpay has taken the payment and the confirm API has verified it.
 * The screen renders the receipt stored by the pay flow, so a refresh keeps it.
 */

export const metadata: Metadata = {
  title: "Entry confirmed",
  description:
    "Your Game On Multisports League entry is confirmed — the match day, venue, reference and payment details of your pass.",
  robots: { index: false, follow: false },
};

export default function MultisportsLeagueSuccessPage() {
  return <LeagueConfirmationScreen />;
}
