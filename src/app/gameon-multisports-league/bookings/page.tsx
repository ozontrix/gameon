"use client";

/**
 * Game On Multisports League — My Bookings.
 *
 * Static sample entries so the tab bar leads somewhere real; actions raise a
 * toast because the flow is UI only for now.
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, MapPin, QrCode, XCircle } from "lucide-react";
import { formatINR } from "@/components/league/data";
import { Button, Chip, IconTile, Kicker, Panel, ScreenHeader } from "@/components/league/ui";

type Tab = "upcoming" | "past";

interface SampleBooking {
  id: string;
  event: string;
  category: string;
  date: string;
  slot: string;
  squad: number;
  venue: string;
  emoji: string;
  accent: string;
  paid: number;
  tab: Tab;
  status: "Confirmed" | "Completed";
}

const BOOKINGS: SampleBooking[] = [
  {
    id: "GO-L4K21P",
    event: "Badminton Open",
    category: "Men's Doubles",
    date: "Sat, 12 Dec 2026",
    slot: "6:00 PM",
    squad: 2,
    venue: "Indoor Courts · Zone A",
    emoji: "🏸",
    accent: "#A855F7",
    paid: 1800,
    tab: "upcoming",
    status: "Confirmed",
  },
  {
    id: "GO-L7T8M2",
    event: "Box Cricket 7v7 League",
    category: "Team Entry (7v7)",
    date: "Sat, 19 Dec 2026",
    slot: "8:00 PM",
    squad: 7,
    venue: "Astro Turf Arena · Zone C",
    emoji: "🏏",
    accent: "#34D399",
    paid: 2000,
    tab: "upcoming",
    status: "Confirmed",
  },
  {
    id: "GO-L2H9Q1",
    event: "Pickleball Championship",
    category: "Mixed Doubles",
    date: "Sun, 14 Dec 2026",
    slot: "5:00 PM",
    squad: 2,
    venue: "Indoor + Outdoor · Zone B",
    emoji: "🏓",
    accent: "#F5D000",
    paid: 800,
    tab: "past",
    status: "Completed",
  },
];

export default function OlympicsBookingsPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const entries = BOOKINGS.filter((booking) => booking.tab === tab);

  return (
    <div>
      <ScreenHeader
        title="My Bookings"
        subtitle={`${BOOKINGS.filter((booking) => booking.tab === "upcoming").length} upcoming entries`}
        backHref="/gameon-multisports-league"
      />

      <div className="pill-container mb-4 w-full sm:w-auto">
        {(
          [
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Completed" },
          ] as { value: Tab; label: string }[]
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            data-active={tab === option.value}
            onClick={() => setTab(option.value)}
            className="pill-option flex-1"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {entries.map((booking) => (
          <Panel key={booking.id}>
            <div className="flex items-start gap-3">
              <IconTile emoji={booking.emoji} accent={booking.accent} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base uppercase leading-tight text-go-white">
                    {booking.event}
                  </h2>
                  <Chip tone={booking.status === "Confirmed" ? "success" : "neutral"}>
                    {booking.status}
                  </Chip>
                </div>
                <p className="mt-0.5 text-[12.5px] text-go-off/55">{booking.category}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-go-off/45">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {booking.date} · {booking.slot}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {booking.venue}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <div>
                <Kicker>Reference</Kicker>
                <p className="font-mono text-[12.5px] text-go-white">{booking.id}</p>
              </div>
              <div className="text-right">
                <Kicker>Squad · Paid</Kicker>
                <p className="text-[12.5px] text-go-white">
                  {booking.squad} players · {formatINR(booking.paid)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => toast.success(`${booking.event} pass is ready to scan.`)}
                size="sm"
                icon={QrCode}
              >
                View pass
              </Button>
              {booking.tab === "upcoming" ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.message("Slot changes open 24 hours before the match.")}
                  >
                    Change slot
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={XCircle}
                    onClick={() => toast.error("Cancellations need a 72-hour window.")}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.message("Scorecard arrives on WhatsApp within an hour.")}
                >
                  View scorecard
                </Button>
              )}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 border-go-brand/20 bg-go-brand/[0.06]">
        <p className="text-[12.5px] text-go-off/70">
          Looking for another bracket?{" "}
          <Link href="/gameon-multisports-league" className="font-semibold text-go-brand">
            Browse all sports and categories
          </Link>
          .
        </p>
      </Panel>
    </div>
  );
}
