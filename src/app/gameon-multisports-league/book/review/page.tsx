"use client";

/**
 * Game On Multisports League — step 2: review.
 *
 * One screen with everything the player is about to pay for: the entry, the
 * squad, add-ons, a coupon box and the full price breakdown.
 */

import { useState } from "react";
import Link from "next/link";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";
import {
  ADD_ONS,
  COUPONS,
  formatDayLabel,
  formatINR,
  type Coupon,
} from "@/components/league/data";
import { useLeagueBooking } from "@/components/league/booking-context";
import { LeaguePayButton } from "@/components/league/pay-button";
import {
  Button,
  Chip,
  EmptyState,
  IconTile,
  InfoRow,
  Kicker,
  Panel,
  ScreenHeader,
  StepBar,
  StepFooter,
} from "@/components/league/ui";
import { cn } from "@/lib/utils";

function hasEligibleEntry(coupon: Coupon, entryFee: number) {
  return entryFee >= coupon.minSubtotal;
}

export default function OlympicsReviewPage() {
  const { draft, ready, sport, categories, pricing, applyCoupon, removeCoupon } =
    useLeagueBooking();
  const [code, setCode] = useState("");

  if (ready && (!sport || categories.length === 0)) {
    return (
      <EmptyState
        emoji="🧾"
        title="Nothing to review"
        copy="Pick a sport and at least one category first — your entry summary will show up here."
        ctaLabel="Browse sports"
        ctaHref="/gameon-multisports-league"
      />
    );
  }

  const handleApply = (value: string) => {
    const result = applyCoupon(value);
    if (result.ok) {
      toast.success(result.message);
      setCode("");
    } else {
      toast.error(result.message);
    }
  };

  const addOnLines = ADD_ONS.filter((addOn) => (draft.addons[addOn.id] ?? 0) > 0);

  return (
    <div>
      <StepBar current="review" />
      <ScreenHeader
        title="Review entry"
        subtitle="Check everything before you pay"
        backHref="/gameon-multisports-league/book/details"
      />

      {/* ─── Entry ─── */}
      <Panel className="mb-3">
        <div className="flex items-start gap-3">
          <IconTile emoji={sport?.emoji ?? "🏸"} accent={sport?.accent ?? "#F38F2F"} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg uppercase leading-tight text-go-white">
              {sport?.name}
            </h2>
            <p className="mt-0.5 text-[13px] text-go-off/60">
              {categories.map((item) => item.name).join(" + ")}
            </p>
            <p className="mt-2 text-[12px] text-go-off/45">
              {formatDayLabel(draft.date)} · {draft.slot ?? "slot to be confirmed"}
            </p>
          </div>
          <Link
            href={
              sport ? `/gameon-multisports-league/sports/${sport.id}` : "/gameon-multisports-league"
            }
            className="shrink-0 text-[12px] font-semibold text-go-brand"
          >
            Edit
          </Link>
        </div>
      </Panel>

      {/* ─── Squad ─── */}
      <Panel className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <Kicker>{sport?.mode === "team" ? "Team" : "Player"}</Kicker>
          <Link
            href="/gameon-multisports-league/book/details"
            className="text-[12px] font-semibold text-go-brand"
          >
            Edit
          </Link>
        </div>
        <div className="mt-2">
          {draft.teamName ? <InfoRow label="Team" value={draft.teamName} strong /> : null}
          <InfoRow label="Name" value={draft.captainName || "—"} />
          <InfoRow label="Mobile" value={draft.phone || "—"} />
          {draft.email ? <InfoRow label="Email" value={draft.email} /> : null}
          {draft.city ? <InfoRow label="City" value={draft.city} /> : null}
          <InfoRow
            label={sport?.mode === "team" ? "Squad size" : "Tickets"}
            value={
              sport?.mode === "team"
                ? `${draft.squadSize} players`
                : `${draft.squadSize} ${draft.squadSize === 1 ? "ticket" : "tickets"}`
            }
          />
          {draft.notes ? <InfoRow label="Notes" value={draft.notes} /> : null}
        </div>
      </Panel>

      {/* ─── Add-ons ─── */}
      {addOnLines.length > 0 ? (
        <Panel className="mb-3">
          <Kicker>Add-ons</Kicker>
          <div className="mt-2">
            {addOnLines.map((addOn) => {
              const qty = draft.addons[addOn.id] ?? 0;
              return (
                <InfoRow
                  key={addOn.id}
                  label={`${addOn.emoji} ${addOn.name} × ${qty}`}
                  value={formatINR(addOn.price * qty)}
                />
              );
            })}
          </div>
        </Panel>
      ) : null}

      {/* ─── Coupon ─── */}
      <Panel className="mb-3">
        <div className="mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-go-brand" />
          <Kicker>Coffee? No — coupon</Kicker>
        </div>

        {pricing.couponCode ? (
          <div className="flex items-center justify-between gap-3 rounded-[16px] border border-go-brand/45 bg-go-brand/[0.1] px-3.5 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[13px] font-semibold tracking-[0.12em] text-go-brand">
                {pricing.couponCode}
              </p>
              <p className="text-[11.5px] text-go-off/55">
                {pricing.couponLabel} · saving {formatINR(pricing.discount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeCoupon()}
              aria-label="Remove coupon"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-go-off/60 transition-colors hover:text-go-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Enter code"
                className="h-11 min-w-0 flex-1 rounded-[14px] border border-white/[0.09] bg-white/[0.03] px-3.5 font-mono text-[13px] tracking-[0.1em] text-go-white placeholder:text-go-off/25 focus:border-go-brand/60 focus:outline-none"
              />
              <Button onClick={() => handleApply(code)} disabled={code.trim().length < 3}>
                Apply
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {COUPONS.map((coupon) => {
                const eligible = hasEligibleEntry(coupon, pricing.entryFee);
                return (
                  <button
                    key={coupon.code}
                    type="button"
                    disabled={!eligible}
                    onClick={() => handleApply(coupon.code)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[16px] border px-3.5 py-2.5 text-left transition-colors",
                      eligible
                        ? "border-white/[0.08] bg-white/[0.02] hover:border-go-brand/40 hover:bg-go-brand/[0.07]"
                        : "cursor-not-allowed border-white/[0.05] bg-white/[0.01] opacity-50"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-[12px] tracking-[0.12em] text-go-white">
                        {coupon.code}
                      </span>
                      <span className="block text-[11px] text-go-off/45">{coupon.label}</span>
                    </span>
                    <Chip tone={eligible ? "brand" : "neutral"}>
                      {eligible ? "Tap to apply" : "Not eligible"}
                    </Chip>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Panel>

      {/* ─── Price breakdown ─── */}
      <Panel className="mb-4">
        <Kicker>Price details</Kicker>
        <div className="mt-2">
          {categories.map((item) => (
            <InfoRow
              key={item.id}
              label={`Entry fee · ${item.name}`}
              value={formatINR(item.fee)}
            />
          ))}
          {categories.length > 1 ? (
            <InfoRow label="Entry fee total" value={formatINR(pricing.entryFee)} strong />
          ) : null}
          {pricing.addOnsTotal > 0 ? (
            <InfoRow label="Add-ons" value={formatINR(pricing.addOnsTotal)} />
          ) : null}
          {pricing.discount > 0 ? (
            <InfoRow label={`Discount · ${pricing.couponCode}`} value={`- ${formatINR(pricing.discount)}`} />
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3.5">
          <span className="font-display text-base uppercase tracking-wide text-go-white">
            Total payable
          </span>
          <span className="font-display text-2xl text-go-brand">{formatINR(pricing.total)}</span>
        </div>
        <p className="mt-2 text-[11px] text-go-off/35">
          Free cancellation up to 72 hours before the event. Entries are transferable after that.
        </p>
      </Panel>

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              Total payable
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {formatINR(pricing.total)}
            </p>
          </div>
          <LeaguePayButton
            label={`Proceed to pay ${formatINR(pricing.total)}`}
            className="flex-1 lg:flex-none"
          />
        </div>
      </StepFooter>
    </div>
  );
}
