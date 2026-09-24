"use client";

/**
 * Game On Multisports League — category page.
 *
 * Opens from a sport card on the league landing and hands the chosen category
 * straight to the details step — the flow has no date screen. Kept lean on
 * purpose: the intro paragraph carries the facts (court counts), the chips under
 * it are only the slot length and the entry cap, and the page ends with the
 * category list. No venue/zone, surface, highlight or format & rules blocks.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, Timer, Users } from "lucide-react";
import { findCategories, entryFees, entryTickets, findSport, formatINR, type SportId } from "@/components/league/data";
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
  const { draft, startBooking } = useLeagueBooking();
  const sport = findSport(sportId);
  // A local override wins; otherwise fall back to the brackets already in the draft.
  const [override, setOverride] = useState<string[] | null>(null);
  const selected = override ?? (draft.sport === sportId ? draft.categoryIds : []);

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
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <Chip icon={Timer} className="justify-start">
            {sport.slotLength}
          </Chip>
          <Chip icon={Users} className="justify-start">
            {sport.capacity}
          </Chip>
        </div>
      </Panel>

      <div className="mb-3">
        <h2 className="font-display text-lg uppercase tracking-wide text-go-white">
          Pick your categories
        </h2>
        <p className="mt-0.5 text-[12px] text-go-off/45">
          {sport.categories.length} {sport.categories.length === 1 ? "category" : "categories"} · fee
          is per entry · pick as many as you like
        </p>
      </div>

      <div className="space-y-2.5">
        {sport.categories.map((item) => {
          const active = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
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
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-colors",
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
            disabled={chosen.length === 0}
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
