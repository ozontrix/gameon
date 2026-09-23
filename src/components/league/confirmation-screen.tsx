"use client";

/**
 * Game On Multisports League — the pass shown after a verified payment.
 *
 * Reads the receipt the confirm API handed back (kept in sessionStorage so a
 * refresh keeps the pass). Without one there is nothing to celebrate, so the
 * screen says so instead of inventing a booking.
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Ticket,
  Users,
} from "lucide-react";
import { findSport, formatINR } from "@/components/league/data";
import { LEAGUE_CONFIRMATION_KEY, type LeagueConfirmation } from "@/lib/league/confirmation";
import { LEAGUE_HELP_PHONE, LEAGUE_VENUE, matchDayLabel } from "@/lib/league/constants";
import { Button, Chip, EmptyState, InfoRow, Kicker, Panel } from "./ui";
import { cn } from "@/lib/utils";

const BASE = "/gameon-multisports-league";

const subscribeNoop = () => () => {};

function readStored(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(LEAGUE_CONFIRMATION_KEY) ?? "";
  } catch {
    return "";
  }
}

/** `useSyncExternalStore` keeps SSR (no receipt) and the client in step. */
function useStoredConfirmation(): LeagueConfirmation | null {
  const raw = useSyncExternalStore(subscribeNoop, readStored, () => "");

  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LeagueConfirmation;
    } catch {
      return null;
    }
  }, [raw]);
}

function ConfettiBurst() {
  useEffect(() => {
    let active = true;
    import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (!active) return;
        confetti({
          particleCount: 120,
          spread: 80,
          startVelocity: 44,
          origin: { y: 0.3 },
          colors: ["#F5A623", "#FFFFFF", "#38BDF8", "#A855F7"],
        });
      })
      .catch(() => {
        // Confetti is decorative — never break the pass for it.
      });
    return () => {
      active = false;
    };
  }, []);

  return null;
}

export function LeagueConfirmationScreen() {
  const confirmation = useStoredConfirmation();

  if (!confirmation) {
    return (
      <EmptyState
        emoji="🎟️"
        title="No confirmed entry yet"
        copy="Once a payment goes through, your pass and booking ID appear here."
        ctaLabel="Back to the league"
        ctaHref={BASE}
      />
    );
  }

  const { entry, quote } = confirmation;
  const sport = findSport(entry.sport);
  const day = matchDayLabel(entry.date);
  const paidAt = new Date(confirmation.paidAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div>
      <ConfettiBurst />

      {/* ─── Hero ─── */}
      <div className="mb-5 flex flex-col items-center text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border border-go-brand/40 bg-go-brand/15 text-go-brand"
        >
          <Check className="h-9 w-9" />
          <span className="pulse-ring absolute inset-0 rounded-full border border-go-brand/35" />
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="mt-4 font-display text-3xl uppercase leading-tight text-go-white"
        >
          You&apos;re in!
        </motion.h1>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-go-off/60">
          Payment of <strong className="text-go-white">{formatINR(confirmation.amount)}</strong>{" "}
          received. Your {entry.sportName} · {entry.categoryName} entry on {day} is confirmed.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Chip tone="brand" icon={Ticket}>
            {confirmation.reference}
          </Chip>
          <Chip tone="success" icon={Check}>
            Paid
          </Chip>
        </div>
      </div>

      {/* ─── Pass ─── */}
      <Panel className="mb-3 border-go-brand/25 bg-gradient-to-br from-go-brand/[0.14] via-white/[0.03] to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Kicker>Game On Multisports League · Season 1</Kicker>
            <h2 className="mt-1.5 font-display text-xl uppercase leading-tight text-go-white">
              {entry.sportName}
            </h2>
            <p className="text-[12.5px] text-go-off/60">{entry.categoryName}</p>
          </div>
          <span className="text-3xl" aria-hidden>
            {sport?.emoji ?? "🏆"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Match day", value: day.replace(/,\s\d{4}$/, "") },
            { label: "Entry", value: entry.squadSize > 1 ? `${entry.squadSize} tickets` : "1 ticket" },
            { label: entry.teamName ? "Team" : "Player", value: entry.teamName || entry.captainName },
            { label: "Booking ID", value: confirmation.reference },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-[16px] border border-white/[0.08] bg-go-black/35 px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-wider text-go-off/40">{tile.label}</p>
              <p className="mt-0.5 truncate text-[12.5px] font-semibold text-go-white">
                {tile.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-[16px] border border-white/[0.08] bg-go-black/30 px-3 py-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-go-brand" />
          <span className="min-w-0 text-[12.5px] leading-snug text-white">{LEAGUE_VENUE}</span>
        </div>

        <div className="mt-4 flex items-start gap-2.5 border-t border-dashed border-white/15 pt-4">
          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-go-brand" />
          <p className="min-w-0 text-[12px] leading-relaxed text-go-off/55">
            Show your booking ID{" "}
            <b className="font-mono tracking-[0.06em] text-white">{confirmation.reference}</b> at the
            front desk to check in
            {entry.squadSize > 1 ? ` — ${entry.squadSize} players, one pass each.` : "."}
          </p>
        </div>
      </Panel>

      {/* ─── Email ─── */}
      <Panel
        className={cn(
          "mb-3",
          confirmation.emailSent
            ? "border-emerald-400/25 bg-emerald-400/[0.07]"
            : "border-amber-400/25 bg-amber-400/[0.07]"
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border",
              confirmation.emailSent
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            )}
          >
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-go-white">
              {confirmation.emailSent ? "Confirmation email sent" : "We could not email your pass"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-go-off/55">
              {confirmation.emailSent ? (
                <>
                  Your entry pass with every detail is on its way to{" "}
                  <b className="text-go-white">{entry.email}</b> — check the spam folder if it has not
                  arrived in a few minutes.
                </>
              ) : (
                <>
                  Save your reference <b className="text-go-white">{confirmation.reference}</b> — the
                  desk can look your entry up with it, or call {LEAGUE_HELP_PHONE} and we will resend.
                </>
              )}
            </p>
          </div>
        </div>
      </Panel>

      {/* ─── Payment ─── */}
      <Panel className="mb-3">
        <div className="flex items-center justify-between gap-3">
          <Kicker>Payment</Kicker>
          <Chip tone="success" icon={CreditCard}>
            Razorpay
          </Chip>
        </div>
        <div className="mt-2">
          <InfoRow label="Entry fee" value={formatINR(quote.entryFee)} />
          {quote.addOnsTotal > 0 ? (
            <InfoRow label="Add-ons" value={formatINR(quote.addOnsTotal)} />
          ) : null}
          {quote.discount > 0 && quote.couponCode ? (
            <InfoRow label={`Discount · ${quote.couponCode}`} value={`- ${formatINR(quote.discount)}`} />
          ) : null}
          <InfoRow label="Platform fee" value={formatINR(quote.platformFee)} />
          <InfoRow label="GST (18%)" value={formatINR(quote.gst)} />
          <InfoRow label="Total paid" value={formatINR(confirmation.amount)} strong />
        </div>

        <div className="mt-3 border-t border-white/[0.07] pt-3">
          <InfoRow
            label="Payment id"
            value={<span className="font-mono text-[11.5px]">{confirmation.paymentId}</span>}
          />
          <InfoRow
            label="Order id"
            value={<span className="font-mono text-[11.5px]">{confirmation.orderId}</span>}
          />
          <InfoRow label="Paid on" value={paidAt} />
        </div>

        {entry.addons.length > 0 ? (
          <div className="mt-3 border-t border-white/[0.07] pt-3">
            <p className="text-[11px] uppercase tracking-wider text-go-off/40">Add-ons included</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {entry.addons.map((addOn) => (
                <Chip key={addOn.id}>
                  {addOn.emoji} {addOn.name} × {addOn.qty}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>

      {/* ─── Next steps ─── */}
      <Panel className="mb-4">
        <Kicker>What happens next</Kicker>
        <ul className="mt-3 space-y-3">
          {[
            {
              icon: Clock,
              title: "Match timing on WhatsApp",
              copy: `Your exact slot is scheduled by the organisers and shared 24 hours before ${day}.`,
            },
            {
              icon: Users,
              title: "Report 15 minutes early",
              copy: "Carry a photo ID and this reference for check-in at the desk.",
            },
            {
              icon: CalendarDays,
              title: "Free cancellation",
              copy: "Cancel up to 72 hours before your match day for a full refund to the same method.",
            },
          ].map((step) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-go-brand/25 bg-go-brand/10 text-go-brand">
                <step.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-go-white">{step.title}</span>
                <span className="block text-[12px] leading-relaxed text-go-off/50">{step.copy}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Button href={BASE} size="lg" full>
        Book another sport
      </Button>

      <a
        href={`tel:${LEAGUE_HELP_PHONE.replace(/\s/g, "")}`}
        className="mt-3.5 flex items-center justify-center gap-2 text-[12px] text-go-off/45 transition-colors hover:text-go-brand"
      >
        <Phone className="h-3.5 w-3.5" />
        Need a hand? Call the front desk on {LEAGUE_HELP_PHONE}
      </a>
    </div>
  );
}
