"use client";

/**
 * Game On Olympics — all sports.
 *
 * Lists every sport in the Olympics with its categories and entry fees, and
 * filters between individual brackets and team entries.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { SPORTS, formatINR, type EntryMode } from "@/components/olympics/data";
import { Button, Chip, IconTile, Kicker, Panel, ScreenHeader } from "@/components/olympics/ui";

type Filter = "all" | EntryMode;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All sports" },
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
];

export default function OlympicsSportsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = SPORTS.filter((sport) => filter === "all" || sport.mode === filter);

  return (
    <div>
      <ScreenHeader
        title="All Sports"
        subtitle="4 sports · 8 categories · Season 1 registration is open"
        backHref="/gameon-olympics"
      />

      <div className="pill-container mb-4 w-full sm:w-auto">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            data-active={filter === option.value}
            onClick={() => setFilter(option.value)}
            className="pill-option flex-1"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((sport) => (
          <Panel key={sport.id} className="flex flex-col">
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
                <p className="mt-1 text-[12px] text-go-off/50">{sport.tagline}</p>
              </div>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-go-off/70">{sport.description}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={MapPin}>{sport.venue}</Chip>
              <Chip icon={Users}>{sport.capacity}</Chip>
            </div>

            <div className="mt-4 space-y-1.5">
              {sport.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/gameon-olympics/sports/${sport.id}`}
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-go-brand/30 hover:bg-go-brand/[0.06]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-go-white">
                      {category.name}
                    </span>
                    <span className="block text-[11px] text-go-off/45">{category.format}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[13px] font-semibold text-go-brand">
                    {formatINR(category.fee)}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <div>
                <Kicker>Starts from</Kicker>
                <p className="font-display text-lg text-go-white">
                  {formatINR(Math.min(...sport.categories.map((c) => c.fee)))}
                </p>
              </div>
              <Button href={`/gameon-olympics/sports/${sport.id}`} size="md">
                View categories
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <span
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl"
              style={{ background: sport.accent }}
              aria-hidden
            />
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 border-go-brand/20 bg-go-brand/[0.07]">
        <Kicker>Not sure where you fit?</Kicker>
        <p className="mt-2 text-[13px] text-go-off/70">
          Call the front desk on <span className="font-semibold text-go-white">+91 98110 00000</span>{" "}
          and we will slot you into the right bracket.
        </p>
      </Panel>
    </div>
  );
}
