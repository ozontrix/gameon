"use client";

import { ShoppingCart, ArrowRight } from "lucide-react";
import { useLeagueBooking } from "./booking-context";
import { CategorySchedule } from "./category-schedule";
import { formatINR, type SportId } from "./data";
import { Button, Kicker, Panel, StepFooter } from "./ui";

export function LeagueCartSummary({ footer = false }: { footer?: boolean }) {
  const { ready, categories, sports, pricing, removeSelection, clearCart } = useLeagueBooking();
  if (!ready || !categories.length) return null;
  return (
    <>
      <Panel className="my-5 border-go-brand/25 bg-go-brand/[0.06]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Kicker>Your cart</Kicker>
            <h2 className="mt-1 flex items-center gap-2 font-display text-lg uppercase text-go-white">
              <ShoppingCart className="h-5 w-5" aria-hidden />
              {categories.length} {categories.length === 1 ? "category" : "categories"} · {sports.length} {sports.length === 1 ? "sport" : "sports"}
            </h2>
          </div>
          <button type="button" onClick={clearCart} className="min-h-11 cursor-pointer text-xs font-semibold text-go-brand hover:text-go-white focus-visible:outline-2 focus-visible:outline-go-brand">
            Clear cart
          </button>
        </div>
        <CategorySchedule categories={categories} onRemove={(sportId, categoryId) => removeSelection({ sportId: sportId as SportId, categoryId })} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-go-off/75">Entry fees <strong className="ml-2 text-go-white">{formatINR(pricing.entryFee)}</strong></p>
          <Button href="/gameon-multisports-league/book/details">Checkout <ArrowRight className="h-4 w-4" /></Button>
        </div>
        <p role="status" className="mt-3 text-xs text-go-off/70">Selections are saved as you browse. Add categories from another sport or checkout together.</p>
      </Panel>
      {footer ? (
        <StepFooter>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-go-off/70">{categories.length} {categories.length === 1 ? "category" : "categories"} in cart</p>
              <p className="font-display text-lg text-go-white">{formatINR(pricing.total)}</p>
            </div>
            <Button href="/gameon-multisports-league/book/details" size="lg">Checkout <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </StepFooter>
      ) : null}
    </>
  );
}