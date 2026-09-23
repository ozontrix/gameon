"use client";

/**
 * Game On Olympics — step 4: payment method.
 *
 * UI only: no gateway is called. "Pay" simulates the Razorpay hand-off and
 * lands on the confirmation pass, so the whole flow can be clicked through.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import { formatINR } from "@/components/olympics/data";
import { useOlympicsBooking } from "@/components/olympics/booking-context";
import {
  Button,
  Chip,
  EmptyState,
  InfoRow,
  Kicker,
  Panel,
  ScreenHeader,
  StepBar,
  StepFooter,
} from "@/components/olympics/ui";
import { cn } from "@/lib/utils";

type Method = "upi" | "card" | "netbanking" | "venue";

const METHODS: {
  id: Method;
  label: string;
  copy: string;
  icon: typeof Smartphone;
  tag?: string;
}[] = [
  {
    id: "upi",
    label: "UPI",
    copy: "GPay, PhonePe, Paytm or any UPI app",
    icon: Smartphone,
    tag: "Instant",
  },
  { id: "card", label: "Credit / Debit card", copy: "Visa, Mastercard, RuPay, Amex", icon: CreditCard },
  { id: "netbanking", label: "Netbanking", copy: "All major Indian banks", icon: Landmark },
  {
    id: "venue",
    label: "Pay at the venue",
    copy: "Hold the slot for 2 hours, pay at the front desk",
    icon: Store,
    tag: "No fee",
  },
];

/** The extra inputs each method reveals when it is selected. */
function MethodDetail({ method, total }: { method: Method; total: number }) {
  if (method === "upi") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {["GPay", "PhonePe", "Paytm", "BHIM", "Cred", "Any UPI"].map((app) => (
          <span
            key={app}
            className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-2 py-2.5 text-center text-[12px] font-medium text-go-off/75"
          >
            {app}
          </span>
        ))}
      </div>
    );
  }

  if (method === "card") {
    return (
      <div className="space-y-2.5">
        {["Card number", "Name on card"].map((placeholder) => (
          <input
            key={placeholder}
            placeholder={placeholder}
            className="h-11 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.03] px-3.5 text-[13px] text-go-white placeholder:text-go-off/25 focus:border-go-brand/60 focus:outline-none"
          />
        ))}
        <div className="grid grid-cols-2 gap-2.5">
          <input
            placeholder="MM / YY"
            className="h-11 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.03] px-3.5 font-mono text-[13px] text-go-white placeholder:text-go-off/25 focus:border-go-brand/60 focus:outline-none"
          />
          <input
            placeholder="CVV"
            className="h-11 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.03] px-3.5 font-mono text-[13px] text-go-white placeholder:text-go-off/25 focus:border-go-brand/60 focus:outline-none"
          />
        </div>
      </div>
    );
  }

  if (method === "netbanking") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak", "Yes Bank"].map((bank) => (
          <span
            key={bank}
            className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-center text-[12px] font-medium text-go-off/75"
          >
            {bank}
          </span>
        ))}
      </div>
    );
  }

  return (
    <p className="text-[12px] leading-relaxed text-go-off/55">
      Your slot is held for 2 hours. Pay {formatINR(total)} at the front desk when you arrive — carry
      this booking reference or your registered phone number.
    </p>
  );
}

export default function OlympicsPaymentPage() {
  const router = useRouter();
  const { draft, ready, sport, category, pricing, update } = useOlympicsBooking();
  const [method, setMethod] = useState<Method>(
    (draft.paymentMethod as Method | null) ?? "upi"
  );
  const [agreed, setAgreed] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (ready && (!sport || !category)) {
    return (
      <EmptyState
        emoji="💳"
        title="Nothing to pay for yet"
        copy="Complete your entry first — the payment step unlocks once there is a slot and a squad."
        ctaLabel="Browse sports"
        ctaHref="/gameon-olympics/sports"
      />
    );
  }

  const handlePay = () => {
    update({ paymentMethod: method });
    setProcessing(true);
    // Simulated gateway hand-off — the live flow calls Razorpay here.
    window.setTimeout(() => {
      router.push("/gameon-olympics/book/success");
    }, 1400);
  };

  return (
    <div>
      <StepBar current="payment" />
      <ScreenHeader
        title="Payment"
        subtitle={`${sport?.name} · ${category?.name} · ${draft.slot ?? "slot"}`}
        backHref="/gameon-olympics/book/review"
      />

      {/* ─── Amount ─── */}
      <Panel className="mb-4 border-go-brand/25 bg-go-brand/[0.07]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <Kicker>Amount payable</Kicker>
            <p className="mt-1 font-display text-3xl leading-none text-go-white">
              {formatINR(pricing.total)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-go-off/50">
            <Lock className="h-3.5 w-3.5 text-go-brand" />
            Secured payment
          </span>
        </div>
        <div className="mt-3 border-t border-white/10 pt-2">
          <InfoRow label="Entry + add-ons" value={formatINR(pricing.subtotal)} />
          {pricing.discount > 0 ? (
            <InfoRow label="Coupon discount" value={`- ${formatINR(pricing.discount)}`} />
          ) : null}
          <InfoRow
            label="Platform fee + GST"
            value={formatINR(pricing.platformFee + pricing.gst)}
          />
        </div>
      </Panel>

      {/* ─── Methods ─── */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-display text-lg uppercase tracking-wide text-go-white">
          Payment method
        </h2>
        <span className="text-[11px] text-go-off/35">Powered by Razorpay</span>
      </div>

      <div className="space-y-2.5">
        {METHODS.map((item) => {
          const active = method === item.id;
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "overflow-hidden rounded-[20px] border transition-colors",
                active
                  ? "border-go-brand/55 bg-go-brand/[0.09]"
                  : "border-white/[0.07] bg-white/[0.02]"
              )}
            >
              <button
                type="button"
                onClick={() => setMethod(item.id)}
                aria-pressed={active}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border",
                    active
                      ? "border-go-brand/40 bg-go-brand/20 text-go-brand"
                      : "border-white/10 bg-white/[0.04] text-go-off/60"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-go-white">{item.label}</span>
                    {item.tag ? <Chip tone="brand">{item.tag}</Chip> : null}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-go-off/45">{item.copy}</span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-go-brand bg-go-brand text-go-black" : "border-white/25"
                  )}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                </span>
              </button>

              {active ? (
                <div className="border-t border-white/[0.07] px-4 py-3.5">
                  <MethodDetail method={item.id} total={pricing.total} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ─── Agreement ─── */}
      <button
        type="button"
        onClick={() => setAgreed((value) => !value)}
        aria-pressed={agreed}
        className="mt-4 flex w-full items-start gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 text-left"
      >
        <span
          className={cn(
            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            agreed ? "border-go-brand bg-go-brand text-go-black" : "border-white/25"
          )}
        >
          {agreed ? <Check className="h-3 w-3" /> : null}
        </span>
        <span className="text-[12px] leading-relaxed text-go-off/60">
          I have read the event rules and the refund policy, and I confirm the squad details are
          correct. Entries are non-transferable after the first match.
        </span>
      </button>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-go-off/40">
        <ShieldCheck className="h-3.5 w-3.5 text-go-brand/70" />
        256-bit encrypted · Razorpay · Refunds in 5–7 working days
      </div>

      <StepFooter>
        <div className="flex items-center gap-3 lg:justify-between">
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/40">
              {METHODS.find((item) => item.id === method)?.label}
            </p>
            <p className="font-display text-lg leading-tight text-go-white">
              {formatINR(pricing.total)}
            </p>
          </div>
          <Button
            onClick={handlePay}
            disabled={!agreed || processing}
            size="lg"
            className="flex-1 lg:flex-none"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                {method === "venue" ? "Confirm booking" : `Pay ${formatINR(pricing.total)}`}
              </>
            )}
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}
