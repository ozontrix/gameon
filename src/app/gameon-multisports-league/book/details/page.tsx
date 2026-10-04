"use client";

/**
 * Game On Multisports League — step 1: player / team details.
 *
 * The player never picks a squad size: team sports (cricket, football) are
 * locked to the minimum required squad, and individual brackets (badminton,
 * pickleball) book one ticket per player.
 */

import { useRouter } from "next/navigation";
import { ArrowRight, Ticket, Users } from "lucide-react";
import { entryTickets, scheduleLabel, formatINR } from "@/components/league/data";
import { CategorySchedule } from "@/components/league/category-schedule";
import { useLeagueBooking } from "@/components/league/booking-context";
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

export default function LeagueDetailsPage() {
  const router = useRouter();
  const { draft, ready, sport, sports, categories, pricing, update, removeSelection } =
    useLeagueBooking();

  if (ready && (!sport || categories.length === 0)) {
    return (
      <EmptyState
        emoji="📝"
        title="Nothing to fill in yet"
        copy="Choose a sport and a category — then we will ask for your details."
        ctaLabel="Browse sports"
        ctaHref="/gameon-multisports-league"
      />
    );
  }

  const isTeam = sports.some((item) => item.mode === "team");
  const multiSport = sports.length > 1;
  /** Minimum squad for team sports; tickets across every bracket for individuals. */
  const squadSize = Math.max(1, entryTickets(categories));
  const brackets = categories.map((category) => category.name).join(" + ");
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim());
  const missing = [
    isTeam && draft.teamName.trim().length < 2 ? "team name" : null,
    draft.captainName.trim().length > 2 ? null : isTeam ? "captain name" : "player name",
    draft.phone.trim().length >= 10 ? null : "mobile number",
    emailLooksValid ? null : "email",
  ].filter((field): field is string => field !== null);
  const complete = missing.length === 0;

  return (
    <div>
      <StepBar current="details" />
      <ScreenHeader
        title={multiSport ? "Your details" : isTeam ? "Team details" : "Player details"}
        subtitle={
          sport && categories.length > 0
             ? `${categories.length} categories · ${sports.length} sports · ${scheduleLabel(categories)}`
            : "Loading your entry…"
        }
        backHref={
          "/gameon-multisports-league"
        }
      />

      <Panel className="mb-4">
        <Kicker>Your categories &amp; match days</Kicker>
        <p className="mt-2 text-sm text-go-brand">{categories.length} {categories.length === 1 ? "category" : "categories"} selected across {sports.length} {sports.length === 1 ? "sport" : "sports"}</p>
        <div className="mt-3"><CategorySchedule categories={categories} onRemove={(sportId, categoryId) => {
          const selection = draft.selections.find((item) => item.sportId === sportId && item.categoryId === categoryId);
          if (selection) removeSelection(selection);
        }} /></div>
        <div className="mt-3"><Button href="/gameon-multisports-league">Add more sports / categories</Button></div>
        <p className="mt-3 text-xs leading-relaxed text-go-off/75">Match dates are fixed. Exact timings will be shared by the organisers. Please enter only categories you are eligible for.</p>
      </Panel>

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

        {multiSport ? <p className="text-xs text-go-off/75">One contact for every selected category. The team name applies to your cricket / football entries.</p> : null}
        <Field label={multiSport ? "Name" : isTeam ? "Captain name" : "Player name"}>
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
          <Field label="Email" hint="for your pass">
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

        {/* Squad size is never picked by the player — it is set by the format. */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-go-off/70">
              {isTeam && !multiSport ? "Squad size" : "Tickets in this entry"}
            </span>
            <span className="text-[10.5px] text-go-off/35">
              {isTeam && !multiSport ? "set by the league" : "across all categories"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-go-brand/25 bg-go-brand/[0.08] px-3.5 py-3">
            <span className="flex items-center gap-2.5 text-[14px] font-semibold text-go-white">
              {isTeam ? (
                <Users className="h-4 w-4 text-go-brand" />
              ) : (
                <Ticket className="h-4 w-4 text-go-brand" />
              )}
              {squadSize} {isTeam && !multiSport ? "players" : squadSize > 1 ? "tickets" : "ticket"}
            </span>
            <Chip tone="brand">{isTeam && !multiSport ? "Minimum squad" : "Per category"}</Chip>
          </div>

          <p className="mt-2 text-[11.5px] leading-relaxed text-go-off/45">
            {isTeam && !multiSport
              ? `${sport?.name} is played ${squadSize}-a-side, so the minimum required squad is already set — there is no headcount to pick.`
              : `You are booking ${squadSize > 1 ? `${squadSize} tickets — one for each player` : "one ticket, one player"} across ${brackets}. Nothing to select here.`}
          </p>
        </div>
      </Panel>

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              Entry fee
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {formatINR(pricing.entryFee)}
            </p>
            {!complete ? (
              <p className="text-[10.5px] text-amber-300/80">
                Add {missing.join(", ")} to continue
              </p>
            ) : null}
          </div>
          <Button
            onClick={() => {
              // Pin squad size and discard extras from older saved drafts.
              update({ squadSize, addons: {} });
              router.push("/gameon-multisports-league/book/review");
            }}
            disabled={!ready || !complete || categories.length === 0}
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
