"use client";

/**
 * Game On Multisports League — match day picker.
 *
 * The league plays across two match days and every sport shares the same
 * window, so there are no time slots to choose: the player picks 17 or 18
 * October, the organisers schedule the exact timing and confirm it on WhatsApp.
 *
 * Kept deliberately to one decision — two big date tiles and a Confirm bar.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, Clock, MapPin, Sparkles } from "lucide-react";
import { formatINR } from "@/components/league/data";
import { useLeagueBooking } from "./booking-context";
import {
  Button,
  Chip,
  EmptyState,
  Kicker,
  Panel,
  ScreenHeader,
  StepBar,
  StepFooter,
} from "@/components/league/ui";
import { cn } from "@/lib/utils";

const BASE = "/gameon-multisports-league";

/** One address for the whole league — the per-sport zones stay internal. */
const VENUE = "GameOn Multisports Complex, Sector 70, Gurugram";

/** The two match days. Fixed dates, so the tiles render identically on both sides. */
const MATCH_DAYS = [
  { iso: "2026-10-17", label: "Day 1", accent: "#F5A623" },
  { iso: "2026-10-18", label: "Day 2", accent: "#A855F7" },
];

interface DayParts {
  weekday: string;
  day: string;
  month: string;
  year: string;
}

function dayParts(iso: string): DayParts {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    weekday: date.toLocaleDateString("en-IN", { weekday: "long" }),
    day: String(day),
    month: date.toLocaleDateString("en-IN", { month: "long" }),
    year: String(year),
  };
}

export function LeagueDatePicker() {
  const router = useRouter();
  const { draft, ready, sport, category, update } = useLeagueBooking();
  const [picked, setPicked] = useState<string | null>(draft.date);

  if (ready && (!sport || !category)) {
    return (
      <EmptyState
        emoji="🏸"
        title="Pick a sport first"
        copy="Choose a sport and a category from the league board, then pick the day your squad plays."
        ctaLabel="Back to the league"
        ctaHref={BASE}
      />
    );
  }

  const selected = MATCH_DAYS.find((day) => day.iso === picked) ?? null;
  const selectedParts = selected ? dayParts(selected.iso) : null;

  const handleConfirm = () => {
    if (!selected) return;
    update({ date: selected.iso, slot: null });
    router.push(`${BASE}/book/details`);
  };

  return (
    <div>
      <StepBar current="slot" />
      <ScreenHeader
        title="Pick your match day"
        subtitle={
          sport && category ? `${sport.name} · ${category.name}` : "Loading your entry…"
        }
        backHref={sport ? `${BASE}/sports/${sport.id}` : BASE}
        right={
          category ? (
            <span className="shrink-0 text-right">
              <span className="block font-mono text-[15px] font-semibold text-go-brand">
                {formatINR(category.fee)}
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-go-off/40">
                entry fee
              </span>
            </span>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip icon={CalendarDays} tone="brand">
          October 2026
        </Chip>
        <Chip icon={Sparkles}>Two match days</Chip>
      </div>

      {/* ─── The two match days ─── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {MATCH_DAYS.map((day, index) => {
          const parts = dayParts(day.iso);
          const active = picked === day.iso;
          return (
            <motion.button
              key={day.iso}
              type="button"
              onClick={() => setPicked(day.iso)}
              aria-pressed={active}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
              className={cn(
                "relative overflow-hidden rounded-[26px] border p-4 text-left transition-all duration-300 active:scale-[0.98] sm:p-5",
                active
                  ? "border-go-brand bg-go-brand/[0.12] shadow-[0_22px_60px_-28px_rgba(245,166,35,0.95)]"
                  : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full opacity-70 blur-2xl transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle, ${day.accent}55 0%, transparent 70%)`,
                }}
              />

              <div className="relative flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.22em]",
                    active ? "text-go-brand" : "text-go-off/40"
                  )}
                >
                  {day.label}
                </span>
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300",
                    active
                      ? "scale-100 border-go-brand bg-go-brand text-go-black"
                      : "scale-90 border-white/15 text-transparent"
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>

              <p className="relative mt-3 font-display text-[52px] leading-[0.85] text-go-white sm:text-[62px]">
                {parts.day}
              </p>
              <p className="relative mt-1.5 font-display text-[13px] uppercase tracking-[0.16em] text-go-off/70 sm:text-sm">
                {parts.month} {parts.year}
              </p>

              <div className="relative mt-3.5 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
                <span className="text-[12px] font-medium text-white/90">{parts.weekday}</span>
                <Chip tone={active ? "brand" : "success"}>Open</Chip>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ─── Why there is no time to pick ─── */}
      <Panel className="mt-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-go-brand/25 bg-go-brand/10 text-go-brand">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-go-white">No time slots to choose</p>
            <p className="mt-1 text-[12px] leading-relaxed text-go-off/55">
              Pick the day your squad plays. The organisers schedule your exact match timing and
              send it on WhatsApp 24 hours before the day.
            </p>
          </div>
        </div>
      </Panel>

      {/* ─── Selection echo ─── */}
      {selected && selectedParts ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Panel className="mt-3 border-go-brand/25 bg-go-brand/[0.07]">
            <Kicker>Your match day</Kicker>
            <p className="mt-1.5 font-display text-xl uppercase leading-tight text-go-white sm:text-2xl">
              {selectedParts.weekday}, {selectedParts.day} {selectedParts.month}
            </p>

            <div className="mt-3 flex items-start gap-2.5 rounded-[16px] border border-white/[0.08] bg-go-black/30 px-3 py-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-go-brand" />
              <span className="min-w-0 text-[12.5px] leading-snug text-white">{VENUE}</span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <Chip tone="brand">{selected.label} of 2</Chip>
            </div>
          </Panel>
        </motion.div>
      ) : (
        <p className="mt-3 text-center text-[12px] text-go-off/40">
          Tap a day above to carry on — you can change it later.
        </p>
      )}

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              {selectedParts
                ? `${selectedParts.weekday} ${selectedParts.day} ${selectedParts.month}`
                : "Select a date"}
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {category ? formatINR(category.fee) : "—"}
            </p>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            size="lg"
            className="flex-1 lg:flex-none"
          >
            Confirm
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}
