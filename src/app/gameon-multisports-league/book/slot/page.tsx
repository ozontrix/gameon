"use client";

/**
 * Game On Multisports League — step 1: date + match slot.
 *
 * Availability comes from `slotsFor()`, which is deterministic per sport/date,
 * so the grid is identical on the server and the client.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import {
  SLOT_PERIODS,
  formatDayLabel,
  formatINR,
  slotsFor,
  upcomingDays,
} from "@/components/league/data";
import { useLeagueBooking } from "@/components/league/booking-context";
import {
  Button,
  Chip,
  EmptyState,
  Panel,
  ScreenHeader,
  StepBar,
  StepFooter,
} from "@/components/league/ui";
import { cn } from "@/lib/utils";

export default function OlympicsSlotPage() {
  const router = useRouter();
  const { draft, ready, sport, category, update } = useLeagueBooking();

  const days = useMemo(() => upcomingDays(14), []);
  const date = draft.date ?? days[0].iso;
  const slots = useMemo(() => (sport ? slotsFor(sport.id, date) : []), [sport, date]);

  if (ready && (!sport || !category)) {
    return (
      <EmptyState
        emoji="🏸"
        title="Start a booking"
        copy="Pick a sport and a category first — then you can choose your match slot."
        ctaLabel="Browse sports"
        ctaHref="/gameon-multisports-league"
      />
    );
  }

  return (
    <div>
      <StepBar current="slot" />
      <ScreenHeader
        title="Pick your slot"
        subtitle={sport && category ? `${sport.name} · ${category.name}` : "Loading your entry…"}
        backHref={sport ? `/gameon-multisports-league/sports/${sport.id}` : "/gameon-multisports-league"}
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

      {/* ─── Date strip ─── */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-go-brand/70" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/45">
            {formatDayLabel(date)}
          </p>
        </div>
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {days.map((day) => {
            const active = day.iso === date;
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => update({ date: day.iso, slot: null })}
                className={cn(
                  "flex h-[68px] w-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[18px] border transition-all active:scale-95",
                  active
                    ? "border-go-brand bg-go-brand text-go-black"
                    : "border-white/[0.08] bg-white/[0.03] text-go-off/70 hover:border-white/20"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-wider",
                    active ? "text-go-black/70" : "text-go-off/40"
                  )}
                >
                  {day.weekday}
                </span>
                <span className="font-display text-xl leading-none">{day.date}</span>
                <span
                  className={cn(
                    "text-[9px] uppercase tracking-wider",
                    active ? "text-go-black/70" : "text-go-off/40"
                  )}
                >
                  {day.month}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Slots ─── */}
      <div className="space-y-5">
        {SLOT_PERIODS.map((period) => {
          const periodSlots = slots.filter((slot) => slot.period === period);
          if (periodSlots.length === 0) return null;
          const openCount = periodSlots.filter((slot) => slot.state !== "full").length;

          return (
            <section key={period}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="font-display text-base uppercase tracking-wide text-go-white">
                  {period}
                </h2>
                <Chip tone={openCount === 0 ? "warn" : "neutral"}>
                  {openCount === 0 ? "Sold out" : `${openCount} slots open`}
                </Chip>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {periodSlots.map((slot) => {
                  const active = draft.slot === slot.time;
                  const full = slot.state === "full";
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={full}
                      onClick={() => update({ slot: slot.time })}
                      className={cn(
                        "rounded-[18px] border px-3 py-3 text-left transition-all active:scale-[0.98]",
                        full && "cursor-not-allowed border-white/[0.05] bg-white/[0.01] opacity-45",
                        !full && active && "border-go-brand bg-go-brand/[0.14]",
                        !full &&
                          !active &&
                          "border-white/[0.08] bg-white/[0.03] hover:border-go-brand/40 hover:bg-go-brand/[0.07]"
                      )}
                    >
                      <span
                        className={cn(
                          "block font-mono text-[14px] font-semibold",
                          active ? "text-go-brand" : "text-go-white"
                        )}
                      >
                        {slot.time}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-go-off/45">
                        <Users className="h-3 w-3" />
                        {full ? "Full" : `${slot.left} left`}
                      </span>
                      {slot.state === "filling" ? (
                        <span className="mt-1.5 block text-[9.5px] uppercase tracking-wider text-amber-300/80">
                          Filling fast
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Panel className="mt-4">
        <p className="text-[12px] leading-relaxed text-go-off/50">
          Slots are held for 10 minutes while you complete the entry. Pick the slot that suits your
          squad — you can move it later from My Bookings.
        </p>
      </Panel>

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              {draft.slot ? `${draft.slot} · ${formatDayLabel(date)}` : "Select a slot"}
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {category ? formatINR(category.fee) : "—"}
            </p>
          </div>
          <Button
            onClick={() => router.push("/gameon-multisports-league/book/details")}
            disabled={!draft.slot}
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
