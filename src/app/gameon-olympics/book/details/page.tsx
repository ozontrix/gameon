"use client";

/**
 * Game On Olympics — step 2: player / team details and optional add-ons.
 *
 * Squad size drives the price of per-player add-ons (jerseys, merch, pizza),
 * so the totals below update as the headcount changes.
 */

import { useRouter } from "next/navigation";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { ADD_ONS, formatINR } from "@/components/olympics/data";
import { useOlympicsBooking } from "@/components/olympics/booking-context";
import {
  Button,
  Chip,
  EmptyState,
  Kicker,
  Panel,
  ScreenHeader,
  StepBar,
  StepFooter,
} from "@/components/olympics/ui";
import { cn } from "@/lib/utils";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-go-off/70">{label}</span>
        {hint ? <span className="text-[10.5px] text-go-off/35">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-[14px] border border-white/[0.09] bg-white/[0.03] px-3.5 py-3 text-[14px] text-go-white placeholder:text-go-off/25 focus:border-go-brand/60 focus:outline-none";

export default function OlympicsDetailsPage() {
  const router = useRouter();
  const { draft, ready, sport, category, pricing, update, toggleAddOn, setAddOnQty } =
    useOlympicsBooking();

  if (ready && (!sport || !category)) {
    return (
      <EmptyState
        emoji="📝"
        title="Nothing to fill in yet"
        copy="Choose a sport, a category and a slot — then we will ask for your squad details."
        ctaLabel="Browse sports"
        ctaHref="/gameon-olympics/sports"
      />
    );
  }

  const isTeam = sport?.mode === "team";
  const minSquad = category?.squadSize ?? 1;
  const maxSquad = minSquad + 4;
  const complete =
    draft.captainName.trim().length > 2 &&
    draft.phone.trim().length >= 10 &&
    (!isTeam || draft.teamName.trim().length > 1);

  return (
    <div>
      <StepBar current="details" />
      <ScreenHeader
        title={isTeam ? "Team details" : "Player details"}
        subtitle={
          sport && category
            ? `${sport.name} · ${category.name} · ${draft.slot ?? "slot"}`
            : "Loading your entry…"
        }
        backHref="/gameon-olympics/book/slot"
      />

      <Panel className="mb-4 space-y-3.5">
        {isTeam ? (
          <Field label="Team name" hint="shown on the scoreboard">
            <input
              className={inputClass}
              value={draft.teamName}
              onChange={(event) => update({ teamName: event.target.value })}
              placeholder="e.g. Sector 70 Sluggers"
            />
          </Field>
        ) : null}

        <Field label={isTeam ? "Captain name" : "Player name"}>
          <input
            className={inputClass}
            value={draft.captainName}
            onChange={(event) => update({ captainName: event.target.value })}
            placeholder="Full name"
          />
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Mobile number">
            <input
              className={inputClass}
              value={draft.phone}
              inputMode="tel"
              onChange={(event) => update({ phone: event.target.value.replace(/[^\d+\s]/g, "") })}
              placeholder="+91 98110 00000"
            />
          </Field>
          <Field label="Email" hint="optional">
            <input
              className={inputClass}
              value={draft.email}
              type="email"
              onChange={(event) => update({ email: event.target.value })}
              placeholder="you@email.com"
            />
          </Field>
        </div>

        <Field label="City" hint="optional">
          <input
            className={inputClass}
            value={draft.city}
            onChange={(event) => update({ city: event.target.value })}
            placeholder="Gurugram"
          />
        </Field>

        <Field
          label={isTeam ? "Squad size" : "Entries in this draw"}
          hint={`${minSquad} minimum`}
        >
          <div className="flex items-center gap-3 rounded-[14px] border border-white/[0.09] bg-white/[0.03] px-3.5 py-2.5">
            <span className="flex-1 text-[14px] text-go-white">
              {draft.squadSize} {draft.squadSize > 1 ? "players" : "player"}
            </span>
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Decrease squad size"
                disabled={draft.squadSize <= minSquad}
                onClick={() => update({ squadSize: Math.max(minSquad, draft.squadSize - 1) })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-go-off/70 transition-colors hover:text-go-white disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Increase squad size"
                disabled={draft.squadSize >= maxSquad}
                onClick={() => update({ squadSize: Math.min(maxSquad, draft.squadSize + 1) })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-go-brand/40 bg-go-brand/15 text-go-brand transition-colors hover:bg-go-brand/25 disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        </Field>

        <Field label="Anything we should know?" hint="optional">
          <textarea
            className={cn(inputClass, "min-h-[76px] resize-none")}
            value={draft.notes}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="Preferred shuttles, jersey sizes, arrival time…"
          />
        </Field>
      </Panel>

      {/* ─── Add-ons ─── */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Kicker>Optional extras</Kicker>
          <h2 className="mt-1 font-display text-lg uppercase tracking-wide text-go-white">
            Add-ons
          </h2>
        </div>
        {pricing.addOnsTotal > 0 ? (
          <Chip tone="brand">{formatINR(pricing.addOnsTotal)} added</Chip>
        ) : (
          <span className="text-[11px] text-go-off/35">Skip if you don&apos;t need them</span>
        )}
      </div>

      <div className="space-y-2.5">
        {ADD_ONS.map((addOn) => {
          const qty = draft.addons[addOn.id] ?? 0;
          const active = qty > 0;
          const perPlayer = addOn.unit === "player";
          const max = perPlayer ? draft.squadSize + 2 : 1;

          return (
            <div
              key={addOn.id}
              className={cn(
                "rounded-[20px] border px-4 py-3.5 transition-colors",
                active
                  ? "border-go-brand/50 bg-go-brand/[0.1]"
                  : "border-white/[0.07] bg-white/[0.02]"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {addOn.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-go-white">{addOn.name}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-go-off/45">
                    {addOn.description}
                  </p>
                  <p className="mt-1.5 font-mono text-[11.5px] text-go-brand">
                    {formatINR(addOn.price)} / {perPlayer ? "player" : "team"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAddOn(addOn.id)}
                    aria-pressed={active}
                    aria-label={active ? `Remove ${addOn.name}` : `Add ${addOn.name}`}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition-colors active:scale-95",
                      active
                        ? "border-go-brand bg-go-brand text-go-black"
                        : "border-white/15 bg-white/[0.05] text-go-off/70 hover:text-go-white"
                    )}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {active ? "Added" : "Add"}
                  </button>

                  {active && perPlayer ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Fewer"
                        onClick={() => setAddOnQty(addOn.id, qty - 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-go-off/70 disabled:opacity-30"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-mono text-[12px] text-go-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label="More"
                        disabled={qty >= max}
                        onClick={() => setAddOnQty(addOn.id, Math.min(max, qty + 1))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-go-brand/40 bg-go-brand/15 text-go-brand disabled:opacity-30"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}

                  {active ? (
                    <span className="font-mono text-[11px] text-go-off/50">
                      {formatINR(addOn.price * qty)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              {pricing.addOnsTotal > 0
                ? `Entry + ${formatINR(pricing.addOnsTotal)} add-ons`
                : "Entry fee"}
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {formatINR(pricing.subtotal)}
            </p>
            {!complete ? (
              <p className="text-[10.5px] text-amber-300/80">
                Add {isTeam && draft.teamName.trim().length < 2 ? "a team name, " : ""}your name and
                mobile number to continue
              </p>
            ) : null}
          </div>
          <Button
            onClick={() => router.push("/gameon-olympics/book/review")}
            disabled={!complete}
            size="lg"
            className="flex-1 lg:flex-none"
          >
            Review
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}
