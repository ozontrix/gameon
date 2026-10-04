"use client";

/**
 * Game On Multisports League — category page.
 *
 * Opens from a sport card on the league landing and hands the chosen category
 * straight to details. Categories are grouped by their fixed tournament day,
 * with explicit dates and per-person/per-team pricing on every option.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, Trophy, Users } from "lucide-react";
import { categoryDates, categoryFeeUnit, findCategories, entryFees, entryTickets, findSport, formatDayLabel, formatINR, scheduleLabel, type SportId } from "@/components/league/data";
import { LEAGUE_PRIZE_POOL } from "@/lib/league/constants";
import { useLeagueBooking } from "./booking-context";
import {
  Button,
  Chip,
  IconTile,
  Panel,
  ScreenHeader,
  StepFooter,
} from "@/components/league/ui";
import { cn } from "@/lib/utils";

const BASE = "/gameon-multisports-league";

/** Soft accent bloom in the corner of the intro panel. */
function Bloom({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-25 blur-3xl"
      style={{ background: accent }}
    />
  );
}

export function LeagueSportDetail({ sportId }: { sportId: SportId }) {
  const router = useRouter();
  const { draft, ready, startBooking } = useLeagueBooking();
  const sport = findSport(sportId);
  // A local override wins; otherwise fall back to the brackets already in the draft.
  const [override, setOverride] = useState<string[] | null>(null);
  const selected = (override ?? (draft.sport === sportId ? draft.categoryIds : []))
    .filter((id) => sport?.categories.some((category) => category.id === id));

  if (!sport) return null;

  const chosen = findCategories(sport, selected);
  const tickets = entryTickets(chosen);

  const toggle = (id: string) =>
    setOverride(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  const handleContinue = () => {
    if (chosen.length === 0) return;
    startBooking(sport.id, selected);
    router.push(`${BASE}/book/details`);
  };

  return (
    <div>
      <ScreenHeader
        title={sport.name}
        subtitle={sport.tagline}
        backHref={BASE}
        right={<IconTile emoji={sport.emoji} accent={sport.accent} size="lg" />}
      />

      <Panel className="mb-4">
        <Bloom accent={sport.accent} />
        <p className="relative text-[13.5px] leading-relaxed text-go-off/75">{sport.description}</p>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Chip icon={CalendarDays} className="justify-start">
            {scheduleLabel(sport.categories)}
          </Chip>
          <Chip icon={Trophy} tone="brand" className="justify-start">
            {LEAGUE_PRIZE_POOL} overall prize pool
          </Chip>
        </div>
        <p className="relative mt-3 text-[12px] leading-relaxed text-go-off/75">
          Dates are fixed for each category. Exact match timings will be shared by the organisers.
          {sport.id === "badminton" ? " Singles: ₹1,000/person. Doubles and mixed doubles: ₹2,000/team." : ""}
          {sport.id === "pickleball" ? " Entry fees vary by category; see each option below." : ""}
        </p>
      </Panel>

      <div className="mb-3">
        <h2 className="font-display text-lg uppercase tracking-wide text-go-white">
          Pick your categories
        </h2>
        <p className="mt-0.5 text-[12px] text-go-off/70">
          {sport.categories.length} {sport.categories.length === 1 ? "category" : "categories"} · fee
          covers one person for singles or one team for doubles/team sports · select multiple categories if eligible
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {categoryDates(sport.categories).map((date) => (
          <section key={date} aria-labelledby={`match-day-${date}`} className="space-y-2.5">
            <h3 id={`match-day-${date}`} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-go-white">
              <CalendarDays className="h-4 w-4 text-go-brand" aria-hidden />
              {formatDayLabel(date)}
              <span className="text-[11px] font-normal text-go-off/70">
                {sport.categories.filter((item) => item.date === date).length} {sport.categories.filter((item) => item.date === date).length === 1 ? "category" : "categories"}
              </span>
            </h3>
        {sport.categories.filter((item) => item.date === date).map((item) => {
          const active = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={active}
              disabled={!ready}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-[20px] border px-3 py-3.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand disabled:cursor-wait sm:px-4",
                active
                  ? "border-go-brand/60 bg-go-brand/[0.12]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-colors",
                  active ? "border-go-brand bg-go-brand text-go-black" : "border-white/25"
                )}
              >
                {active ? <Check className="h-3 w-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-go-white">{item.name}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-go-brand">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {formatDayLabel(item.date)}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-go-off/70">
                  <Users className="h-3 w-3 shrink-0" aria-hidden />
                  {item.format} · {item.squadSize} {item.squadSize === 1 ? "player" : "players"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-[15px] font-semibold text-go-brand">
                  {formatINR(item.fee)}
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-go-off/70">
                  per {categoryFeeUnit(item)}
                </span>
              </span>
            </button>
          );
        })}
          </section>
        ))}
      </div>

      {chosen.length > 0 ? (
        <Panel className="mt-5 border-go-brand/25 bg-go-brand/[0.06]">
          <p className="text-sm font-semibold text-go-white">Your selected match days</p>
          <p className="mt-1 text-[13px] text-go-brand">{scheduleLabel(chosen)}</p>
          {categoryDates(chosen).length > 1 ? (
            <p className="mt-2 text-[12px] text-go-off/75">Your entry spans both days. Please be available on 17 and 18 October.</p>
          ) : null}
        </Panel>
      ) : null}

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              {chosen.length > 0
                ? `${chosen.length} ${chosen.length === 1 ? "bracket" : "brackets"} · ${tickets} ${
                    tickets === 1 ? "ticket" : "tickets"
                  }`
                : "Select a category"}
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {chosen.length > 0 ? formatINR(entryFees(chosen)) : "—"}
            </p>
          </div>
          <Button
            onClick={handleContinue}
            disabled={!ready || chosen.length === 0}
            size="lg"
            className="flex-1 lg:flex-none"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}
