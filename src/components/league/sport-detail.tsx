"use client";

/**
 * Game On Multisports League — category page.
 *
 * Opens from a sport card on the league landing. Same content as the Olympics
 * sport page — format, rules, every category with its fee — then Continue hands
 * the chosen category to the league's slot page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, MapPin, Timer, Trophy, Users } from "lucide-react";
import { findSport, formatINR, type SportId } from "@/components/league/data";
import { useLeagueBooking } from "./booking-context";
import {
  Button,
  Chip,
  IconTile,
  Kicker,
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
  const { draft, startBooking } = useLeagueBooking();
  const sport = findSport(sportId);
  // A local override wins; otherwise fall back to the category already in the draft.
  const [override, setOverride] = useState<string | null>(null);
  const selected = override ?? (draft.sport === sportId ? draft.categoryId : null);

  if (!sport) return null;

  const category = sport.categories.find((item) => item.id === selected) ?? null;

  const handleContinue = () => {
    if (!selected) return;
    startBooking(sport.id, selected);
    router.push(`${BASE}/book/slot`);
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
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <Chip icon={MapPin} className="justify-start">
            {sport.venue}
          </Chip>
          <Chip icon={Timer} className="justify-start">
            {sport.slotLength}
          </Chip>
          <Chip icon={Users} className="justify-start">
            {sport.capacity}
          </Chip>
          <Chip icon={Trophy} className="justify-start">
            {sport.surface}
          </Chip>
        </div>
      </Panel>

      <Panel className="mb-4">
        <Kicker>Format &amp; rules</Kicker>
        <p className="mt-2 text-[13px] font-medium text-go-white">{sport.format}</p>
        <ul className="mt-3 space-y-2">
          {sport.rules.map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 text-[12.5px] text-go-off/65">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-go-brand" />
              {rule}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          {sport.highlights.map((highlight) => (
            <Chip key={highlight} tone="brand">
              {highlight}
            </Chip>
          ))}
        </div>
      </Panel>

      <div className="mb-3">
        <h2 className="font-display text-lg uppercase tracking-wide text-go-white">
          Pick a category
        </h2>
        <p className="mt-0.5 text-[12px] text-go-off/45">
          {sport.categories.length} {sport.categories.length === 1 ? "category" : "categories"} ·
          fee is per entry
        </p>
      </div>

      <div className="space-y-2.5">
        {sport.categories.map((item) => {
          const active = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOverride(item.id)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left transition-all active:scale-[0.99]",
                active
                  ? "border-go-brand/60 bg-go-brand/[0.12]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active ? "border-go-brand bg-go-brand text-go-black" : "border-white/25"
                )}
              >
                {active ? <Check className="h-3 w-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-go-white">{item.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-go-off/45">
                  <Clock className="h-3 w-3" />
                  {item.format} · squad of {item.squadSize}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-[15px] font-semibold text-go-brand">
                  {formatINR(item.fee)}
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-go-off/40">
                  per entry
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              {category ? category.name : "Select a category"}
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {category ? formatINR(category.fee) : "—"}
            </p>
          </div>
          <Button
            onClick={handleContinue}
            disabled={!category}
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
