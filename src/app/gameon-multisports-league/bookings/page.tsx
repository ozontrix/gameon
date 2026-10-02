import type { Metadata } from "next";
import { LeagueConfirmationScreen } from "@/components/league/confirmation-screen";

export const metadata: Metadata = {
  title: "My league entry",
  robots: { index: false, follow: false },
};

/** Show the actual receipt in this browser session, never fabricated bookings. */
export default function LeagueBookingsPage() {
  return <LeagueConfirmationScreen />;
}