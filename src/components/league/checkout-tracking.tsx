"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLeagueBooking } from "./booking-context";
import { getMarketingConsent, getServerMarketingConsent, leagueEventParameters, subscribeMarketingConsent, trackMetaEvent } from "@/lib/analytics/meta-pixel";

/** Mounted on details: entering checkout, not refreshing the later success page. */
export function LeagueCheckoutTracking() {
  const { ready, categories, pricing } = useLeagueBooking();
  const consent = useSyncExternalStore(subscribeMarketingConsent, getMarketingConsent, getServerMarketingConsent);
  const tracked = useRef(false);
  useEffect(() => {
    if (!ready || !categories.length || consent !== "granted" || tracked.current) return;
    tracked.current = trackMetaEvent("InitiateCheckout", leagueEventParameters(categories, pricing.total));
  }, [ready, categories, pricing.total, consent]);
  return null;
}