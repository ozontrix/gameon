import type { Metadata } from "next";
import { LeagueDatePicker } from "@/components/league/date-picker";

/**
 * The league plays across two match days, so this screen only asks for a date —
 * the timing is scheduled by the organisers. The picker itself is hand-written
 * in `src/components/league/date-picker.tsx`.
 */

export const metadata: Metadata = {
  title: "Pick your match day — 17 & 18 October 2026",
  description:
    "Game On Multisports League plays on 17 and 18 October 2026. Choose the day your squad plays and confirm — the exact match timing is shared by the organisers.",
};

export default function MultisportsLeagueMatchDayPage() {
  return <LeagueDatePicker />;
}
