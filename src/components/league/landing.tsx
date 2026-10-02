"use client";

/**
 * Game On Multisports League — landing page body.
 *
 * A standalone inline brand hero and sport cards showing the entry price each sport starts
 * from — the per-category (slot type) breakdown lives on the category page
 * behind "Select Sport". No header, tab bar or footer.
 *
 * The cards stay deliberately lean: no venue/zone chip (the description carries
 * the facts, e.g. court counts) and no flavour tagline on the team sports.
 *
 * The brand mark is the official `public/game_on.png` wordmark, used exactly as
 * it ships — no rebuilt GAME ⚡ N text lockup and no separate power glyph.
 */

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, CalendarDays, MapPin, Trophy, Users, Zap } from "lucide-react";
import { SPORTS, formatINR, scheduleLabel, type EntryMode } from "@/components/league/data";
import { LEAGUE_HELP_PHONE, LEAGUE_PRIZE_POOL } from "@/lib/league/constants";
import { Button, Chip, IconTile, Kicker, Panel } from "@/components/league/ui";

type Filter = "all" | EntryMode;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All sports" },
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
];

const BASE = "/gameon-multisports-league";

export function LeagueLanding() {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = SPORTS.filter((sport) => filter === "all" || sport.mode === filter);

  return (
    <div>
      {/* ─── Inline landing hero (scrolls with the page — no top bar) ─── */}
      <section className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Image
            src="/game_on.png"
            alt="Game On"
            width={893}
            height={250}
            sizes="130px"
            className="h-8 w-auto object-contain sm:h-9"
          />
          <span className="rounded-full bg-go-brand px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-go-black">
            Multisports League
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl uppercase leading-[0.95] text-go-white sm:text-4xl">
          Pick your sport.
          <br />
          <span className="text-go-brand">Enter the league.</span>
        </h1>
        <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-go-off/60">
          Four sports. {SPORTS.reduce((sum, sport) => sum + sport.categories.length, 0)} categories.
          One arena. Join us on 17 &amp; 18 October 2026 — choose your sport, check your category&apos;s
          match day and register in a few taps.
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Chip icon={MapPin}>Sector 70, Gurugram</Chip>
          <Chip icon={CalendarDays}>17 &amp; 18 October 2026</Chip>
          <Chip icon={Trophy} tone="brand">{LEAGUE_PRIZE_POOL} overall prize pool</Chip>
          <Chip icon={Zap} tone="brand">
            Instant confirmation
          </Chip>
          <Chip icon={Users}>Singles, doubles &amp; teams</Chip>
        </div>
      </section>

      {/* ─── Filters ─── */}
      <div className="pill-container mb-4 w-full sm:w-auto">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            data-active={filter === option.value}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className="pill-option min-h-11 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand"
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* ─── Sports ─── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((sport) => (
          <Panel key={sport.id} className="flex flex-col">
            <span
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl"
              style={{ background: sport.accent }}
              aria-hidden
            />

            <div className="flex items-start gap-3">
              <IconTile emoji={sport.emoji} accent={sport.accent} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl uppercase leading-tight text-go-white">
                    {sport.name}
                  </h2>
                  <Chip tone={sport.mode === "team" ? "warn" : "brand"}>
                    {sport.mode === "team" ? "Team entry" : "Individual"}
                  </Chip>
                </div>
                {sport.tagline ? (
                  <p className="mt-1 text-[12px] text-go-off/50">{sport.tagline}</p>
                ) : null}
              </div>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-go-off/70">{sport.description}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={Users}>{sport.capacity}</Chip>
              <Chip icon={CalendarDays} tone="brand">{scheduleLabel(sport.categories)}</Chip>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <div>
                <Kicker>Starts from</Kicker>
                <p className="font-display text-lg text-go-white">
                  {formatINR(Math.min(...sport.categories.map((c) => c.fee)))}
                </p>
              </div>
              <Button href={`${BASE}/sports/${sport.id}`} size="md">
                Select Sport
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      {/* ─── Help strip ─── */}
      <Panel className="mt-4 border-go-brand/20 bg-go-brand/[0.07]">
        <Kicker>Not sure where you fit?</Kicker>
        <p className="mt-2 text-[13px] text-go-off/70">
          Call the front desk on <a href={`tel:${LEAGUE_HELP_PHONE.replace(/\s/g, "")}`} className="font-semibold text-go-white underline underline-offset-4 transition-colors hover:text-go-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand">{LEAGUE_HELP_PHONE}</a>{" "}
          and we will slot you into the right bracket.
        </p>
      </Panel>

      <p className="mt-4 text-center text-[11px] text-go-off/30">
        Game On Multi Sports · SportsCube Center for Excellence, Sector 70, Gurugram
      </p>
    </div>
  );
}
