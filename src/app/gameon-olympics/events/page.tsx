"use client";

/**
 * Game On Olympics — tournaments & events.
 *
 * Season 1 line-up, how full each bracket is, the day-wise schedule and what
 * the winners take home (trophies, jerseys, medals, podium).
 */

import { ArrowRight, CalendarDays, Clock, MapPin, Trophy } from "lucide-react";
import { OLYMPICS_EVENTS, EVENT_STATS } from "@/components/olympics/data";
import { Button, Chip, IconTile, Kicker, Panel, Progress, ScreenHeader } from "@/components/olympics/ui";

const SCHEDULE = [
  {
    day: "Day 1 · Sat, 12 Dec",
    sport: "Badminton",
    emoji: "🏸",
    accent: "#A855F7",
    items: ["MS & WS league rounds — 9:00 AM", "MD & WD league rounds — 2:00 PM", "Mixed doubles pools — 6:00 PM"],
  },
  {
    day: "Day 2 · Sun, 13 Dec",
    sport: "Pickleball",
    emoji: "🏓",
    accent: "#F5D000",
    items: ["Singles quarterfinals — 9:00 AM", "Doubles semifinals — 1:00 PM", "Finals & podium — 6:30 PM"],
  },
  {
    day: "Day 3 · Sat, 19 Dec",
    sport: "Box Cricket",
    emoji: "🏏",
    accent: "#34D399",
    items: ["League round 1 — 8:00 AM", "League round 2 — 2:00 PM", "Semifinals — 7:00 PM"],
  },
  {
    day: "Day 4 · Sun, 27 Dec",
    sport: "Football",
    emoji: "⚽",
    accent: "#38BDF8",
    items: ["Group stage — 8:00 AM", "Semifinals — 3:00 PM", "Final & trophy night — 8:00 PM"],
  },
];

export default function OlympicsEventsPage() {
  return (
    <div>
      <ScreenHeader
        title="Events"
        subtitle="Season 1 · December 2026 · 4 sports, 8 categories"
        backHref="/gameon-olympics"
      />

      {/* ─── Flagship ─── */}
      <Panel className="mb-4 border-go-brand/25 bg-gradient-to-br from-go-brand/[0.15] via-white/[0.03] to-transparent">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-go-brand/30 bg-go-brand/15 text-go-brand">
            <Trophy className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <Kicker>Flagship</Kicker>
            <h2 className="mt-1 font-display text-xl uppercase leading-tight text-go-white">
              Game On Olympics — Season 1
            </h2>
            <p className="mt-1 text-[12.5px] text-go-off/60">
              12 – 27 December 2026 · Game On Arena, Sector 70 Gurugram
            </p>
          </div>
          <Chip tone="brand">Open</Chip>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EVENT_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[16px] border border-white/[0.08] bg-go-black/35 px-3 py-2.5 text-center"
            >
              <p className="font-display text-xl leading-none text-go-brand">{stat.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-go-off/45">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <Button href="/gameon-olympics/sports" size="md" className="flex-1">
            Register now
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button href="/gameon-olympics/sports" variant="ghost" size="md" className="flex-1">
            See categories &amp; fees
          </Button>
        </div>
      </Panel>

      {/* ─── Brackets ─── */}
      <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-go-white">
        Open brackets
      </h2>
      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        {OLYMPICS_EVENTS.map((event) => (
          <Panel key={event.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg uppercase leading-tight text-go-white">
                  {event.name}
                </h3>
                <p className="mt-1 text-[12px] text-go-off/50">
                  {event.period} · {event.day}
                </p>
              </div>
              <Chip tone={event.status === "Few slots left" ? "warn" : "success"}>
                {event.status}
              </Chip>
            </div>

            <div className="mt-3 space-y-1.5 text-[12px] text-go-off/55">
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-go-brand/60" />
                {event.venue}
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-go-brand/60" />
                {event.bracket}
              </p>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-go-off/45">
                <span>Bracket filled</span>
                <span className="font-mono text-go-off/70">{event.filled}%</span>
              </div>
              <Progress value={event.filled} tone={event.filled > 80 ? "warn" : "brand"} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <span className="font-mono text-[12px] font-semibold text-go-brand">
                {event.entry}
              </span>
              <Button href={event.href} size="sm">
                Register
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      {/* ─── Schedule ─── */}
      <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-go-white">
        Day-wise schedule
      </h2>
      <div className="mb-5 space-y-2.5">
        {SCHEDULE.map((day) => (
          <Panel key={day.day}>
            <div className="flex items-center gap-3">
              <IconTile emoji={day.emoji} accent={day.accent} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-brand/80">
                  {day.day}
                </p>
                <p className="text-[13.5px] font-semibold text-go-white">{day.sport}</p>
              </div>
              <Chip>{day.items.length} blocks</Chip>
            </div>
            <ul className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
              {day.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[12.5px] text-go-off/60">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go-brand/60" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      {/* ─── Prizes ─── */}
      <Panel className="mb-4">
        <Kicker>What winners take home</Kicker>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { emoji: "🏆", title: "Trophies", copy: "Per category winner" },
            { emoji: "🥇", title: "Medals", copy: "Gold, silver, bronze" },
            { emoji: "👕", title: "Jerseys", copy: "Finisher dry-fit tee" },
            { emoji: "🎤", title: "Podium night", copy: "Photos & mascot" },
          ].map((prize) => (
            <div
              key={prize.title}
              className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-center"
            >
              <span className="text-2xl" aria-hidden>
                {prize.emoji}
              </span>
              <p className="mt-1.5 text-[12.5px] font-semibold text-go-white">{prize.title}</p>
              <p className="text-[10.5px] text-go-off/45">{prize.copy}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-go-off/45">
          Participation certificates for every entry, plus match recordings available as an add-on.
        </p>
      </Panel>

      <Panel className="border-go-brand/20 bg-go-brand/[0.06]">
        <p className="text-[12.5px] text-go-off/70">
          Teams can request a corporate bracket on weekdays.{" "}
          <a
            href="mailto:info@gameonmultisports.com?subject=Olympics%20corporate%20bracket"
            className="font-semibold text-go-brand"
          >
            Talk to our events team
          </a>
          .
        </p>
      </Panel>
    </div>
  );
}
