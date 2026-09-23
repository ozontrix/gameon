"use client";

/**
 * Game On Multisports League — step 5: confirmation.
 *
 * The player pass: a deterministic booking reference, the entry summary, a
 * scannable-looking QR block and what to do next.
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarPlus,
  Check,
  MessageCircle,
  ShieldCheck,
  Ticket,
  UserCheck,
} from "lucide-react";
import {
  ADD_ONS,
  formatDayLabel,
  formatINR,
  type SportId,
} from "@/components/league/data";
import { useLeagueBooking } from "@/components/league/booking-context";
import {
  Button,
  Chip,
  EmptyState,
  InfoRow,
  Kicker,
  Panel,
  ScreenHeader,
} from "@/components/league/ui";
import { cn } from "@/lib/utils";

/** Same entry always produces the same reference, so it survives a refresh. */
function bookingRef(sport: SportId | null, categoryId: string | null, slot: string | null) {
  const seed = `${sport ?? "x"}-${categoryId ?? "x"}-${slot ?? "x"}`;
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return `GO-L${Math.abs(value).toString(36).toUpperCase().slice(0, 6).padEnd(6, "4")}`;
}

// 6 × 6 pattern that reads like a scan code.
const QR = "111011101101111111000100111011111101";

export default function OlympicsSuccessPage() {
  const router = useRouter();
  const { draft, ready, sport, category, pricing, reset } = useLeagueBooking();

  if (ready && (!sport || !category)) {
    return (
      <EmptyState
        emoji="🎟️"
        title="No booking pass here"
        copy="Once you complete an entry, your Game On Multisports League pass and QR code will show up on this screen."
        ctaLabel="Book a slot"
        ctaHref="/gameon-multisports-league"
      />
    );
  }

  const reference = bookingRef(draft.sport, draft.categoryId, draft.slot);
  const addOnLines = ADD_ONS.filter((addOn) => (draft.addons[addOn.id] ?? 0) > 0);
  const paid = draft.paymentMethod !== "venue";

  return (
    <div>
      <ScreenHeader title="You're in!" subtitle="Your entry is confirmed" backHref="/gameon-multisports-league" />

      {/* ─── Success badge ─── */}
      <div className="mb-4 flex flex-col items-center text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border border-go-brand/40 bg-go-brand/15 text-go-brand"
        >
          <Check className="h-9 w-9" />
          <span className="pulse-ring absolute inset-0 rounded-full border border-go-brand/35" />
        </motion.span>
        <h1 className="mt-4 font-display text-2xl uppercase leading-tight text-go-white">
          See you on court
        </h1>
        <p className="mt-1.5 max-w-sm text-[13px] text-go-off/55">
          {sport?.name} · {category?.name} · {formatDayLabel(draft.date)} at {draft.slot ?? "TBC"}.
          We have sent the pass to your WhatsApp.
        </p>
        <Chip tone="brand" className="mt-3" icon={Ticket}>
          {reference}
        </Chip>
      </div>

      {/* ─── Pass ─── */}
      <Panel className="mb-4 border-go-brand/25 bg-gradient-to-br from-go-brand/[0.14] via-white/[0.03] to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Kicker>Game On Multisports League · Season 1</Kicker>
            <h2 className="mt-1.5 font-display text-xl uppercase leading-tight text-go-white">
              {sport?.name}
            </h2>
            <p className="text-[12.5px] text-go-off/60">{category?.name}</p>
          </div>
          <span className="text-3xl" aria-hidden>
            {sport?.emoji}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Date", value: formatDayLabel(draft.date) },
            { label: "Slot", value: draft.slot ?? "TBC" },
            { label: "Squad", value: `${draft.squadSize} players` },
            { label: "Venue", value: sport?.venue.split("·")[0]?.trim() ?? "Arena" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[16px] border border-white/[0.08] bg-go-black/35 px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-wider text-go-off/40">{item.label}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-go-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-dashed border-white/15 pt-4">
          <div className="grid h-[92px] w-[92px] shrink-0 grid-cols-6 gap-[3px] rounded-[14px] bg-white p-2">
            {QR.split("").map((cell, index) => (
              <span key={index} className={cn("rounded-[2px]", cell === "1" ? "bg-go-black" : "")} />
            ))}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-go-brand/80">
              Show at check-in
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-go-off/55">
              Front desk scans this code or the reference{" "}
              <b className="text-go-white">{reference}</b> to check your squad in.
            </p>
            {draft.teamName ? (
              <p className="mt-1.5 text-[12px] font-semibold text-go-white">{draft.teamName}</p>
            ) : null}
          </div>
        </div>
      </Panel>

      {/* ─── Payment summary ─── */}
      <Panel className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <Kicker>Payment</Kicker>
          <Chip tone={paid ? "success" : "warn"}>{paid ? "Paid" : "Pay at venue"}</Chip>
        </div>
        <div className="mt-2">
          <InfoRow label="Entry fee" value={formatINR(pricing.entryFee)} />
          {pricing.addOnsTotal > 0 ? (
            <InfoRow label="Add-ons" value={formatINR(pricing.addOnsTotal)} />
          ) : null}
          {pricing.discount > 0 ? (
            <InfoRow label="Coupon" value={`- ${formatINR(pricing.discount)}`} />
          ) : null}
          <InfoRow label="Platform fee + GST" value={formatINR(pricing.platformFee + pricing.gst)} />
          <InfoRow
            label={paid ? "Amount paid" : "Amount due at the desk"}
            value={formatINR(pricing.total)}
            strong
          />
        </div>
        {addOnLines.length > 0 ? (
          <div className="mt-3 border-t border-white/[0.07] pt-3">
            <p className="text-[11px] uppercase tracking-wider text-go-off/40">Add-ons included</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {addOnLines.map((addOn) => (
                <Chip key={addOn.id}>
                  {addOn.emoji} {addOn.name} × {draft.addons[addOn.id]}
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
              icon: MessageCircle,
              title: "Fixture list on WhatsApp",
              copy: "Your league schedule lands 48 hours before the event.",
            },
            {
              icon: UserCheck,
              title: "Report 15 minutes early",
              copy: "Carry a photo ID and your booking reference for check-in.",
            },
            {
              icon: ShieldCheck,
              title: "Free cancellation",
              copy: "Cancel up to 72 hours before the event for a full refund.",
            },
          ].map((step) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-go-brand/25 bg-go-brand/10 text-go-brand">
                <step.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-go-white">{step.title}</span>
                <span className="block text-[12px] text-go-off/50">{step.copy}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          onClick={() => {
            reset();
            router.push("/gameon-multisports-league/bookings");
          }}
          size="lg"
          className="flex-1"
        >
          View my bookings
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          href="/gameon-multisports-league"
          variant="ghost"
          size="lg"
          icon={CalendarPlus}
          className="flex-1"
        >
          Book another sport
        </Button>
      </div>
    </div>
  );
}
