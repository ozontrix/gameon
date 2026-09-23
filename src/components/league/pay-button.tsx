"use client";

/**
 * Game On Multisports League — "Proceed to pay".
 *
 * Opens the real Razorpay Checkout for an order created server-side, then hands
 * the payment back to the confirm API (signature check + confirmation email).
 * The pass is stored in sessionStorage so the next screen can render it.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Button } from "./ui";
import { useLeagueBooking } from "./booking-context";
import { LEAGUE_CONFIRMATION_KEY, type LeagueConfirmation } from "@/lib/league/confirmation";
import { LEAGUE_NAME, matchDayLabel } from "@/lib/league/constants";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const ORDER_API = "/api/v1/public/league/entries/order";
const CONFIRM_API = "/api/v1/public/league/entries/confirm";

/** Loads the hosted Checkout widget once per session. */
function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type Status = "idle" | "starting" | "paying" | "verifying";

interface OrderResponse {
  success?: boolean;
  error?: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface ConfirmResponse {
  success?: boolean;
  error?: string;
  confirmation?: LeagueConfirmation;
}

export function LeaguePayButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const { draft, sport, category, update } = useLeagueBooking();
  const [status, setStatus] = useState<Status>("idle");
  const busy = status !== "idle";

  const buildEntry = () => ({
    sport: draft.sport,
    categoryId: draft.categoryId,
    date: draft.date,
    squadSize: draft.squadSize,
    teamName: draft.teamName,
    captainName: draft.captainName,
    phone: draft.phone,
    email: draft.email,
    city: draft.city,
    notes: draft.notes,
    addons: draft.addons,
    coupon: draft.coupon,
  });

  const handlePay = async () => {
    if (!draft.sport || !draft.categoryId || !draft.date) {
      toast.error("Pick a category and a match day first.");
      return;
    }

    setStatus("starting");
    const entry = buildEntry();

    try {
      const orderRes = await fetch(ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry }),
      });
      const order = (await orderRes.json()) as OrderResponse;

      if (!orderRes.ok || !order.success) {
        toast.error(order.error ?? "We could not start the payment. Please try again.");
        setStatus("idle");
        return;
      }

      const ready = await loadCheckout();
      if (!ready || !window.Razorpay) {
        toast.error("Could not reach Razorpay. Check your connection and try again.");
        setStatus("idle");
        return;
      }

      setStatus("paying");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: LEAGUE_NAME,
        description: `${sport?.name ?? "Entry"} · ${category?.name ?? ""} · ${matchDayLabel(draft.date)}`,
        image: "/game_on_favicon.png",
        prefill: {
          name: draft.captainName || draft.teamName,
          email: draft.email,
          contact: draft.phone,
        },
        notes: {
          sport: sport?.name ?? "",
          category: category?.name ?? "",
          match_day: matchDayLabel(draft.date),
        },
        theme: { color: "#F5A623" },
        retry: { enabled: true },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setStatus("idle");
            toast.message("Payment cancelled — your entry is still here when you're ready.");
          },
        },
        handler: async (payment) => {
          setStatus("verifying");
          try {
            const confirmRes = await fetch(CONFIRM_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entry,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });
            const data = (await confirmRes.json()) as ConfirmResponse;

            if (!confirmRes.ok || !data.success || !data.confirmation) {
              toast.error(
                data.error ?? "Payment received, but we could not confirm it. The desk will call you."
              );
              setStatus("idle");
              return;
            }

            const confirmation = data.confirmation;
            try {
              window.sessionStorage.setItem(LEAGUE_CONFIRMATION_KEY, JSON.stringify(confirmation));
            } catch {
              // Private mode — the confirmation screen still derives what it can.
            }

            update({ paymentMethod: "RAZORPAY" });
            toast.success(`Payment received — ${confirmation.reference} is confirmed!`);
            router.push("/gameon-multisports-league/book/success");
          } catch {
            toast.error(
              "Payment went through but we lost the connection. Check your email for the pass."
            );
            setStatus("idle");
          }
        },
      });

      checkout.open();
    } catch {
      toast.error("Something went wrong starting the payment. Please try again.");
      setStatus("idle");
    }
  };

  const text =
    status === "idle"
      ? label
      : status === "starting"
        ? "Opening Razorpay…"
        : status === "paying"
          ? "Complete the payment"
          : "Confirming your entry…";

  return (
    <Button onClick={handlePay} disabled={busy} size="lg" className={className}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
      {text}
    </Button>
  );
}
