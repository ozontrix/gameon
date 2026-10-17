"use client";

import { useSyncExternalStore } from "react";
import {
  browserPrivacySignal, getMarketingConsent, getServerMarketingConsent,
  setMarketingConsent, subscribeMarketingConsent,
} from "@/lib/analytics/meta-pixel";

/** Inline controls keep preferences accessible without a floating overlay. */
export function CookiePreferences() {
  const consent = useSyncExternalStore(subscribeMarketingConsent, getMarketingConsent, getServerMarketingConsent);
  const privacySignal = consent !== "unknown" && browserPrivacySignal();
  const buttonClass = "min-h-11 cursor-pointer rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-go-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand";

  return (
    <div className="space-y-3" aria-label="Cookie settings">
      <p role="status">
        {privacySignal ? "Your browser privacy signal keeps marketing tracking disabled."
          : consent === "granted" ? "Marketing cookies are currently accepted."
            : consent === "denied" ? "Marketing cookies are currently rejected."
              : "You have not chosen your marketing cookie preference yet."}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} onClick={() => setMarketingConsent("denied")}>Reject marketing</button>
        <button type="button" className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`} disabled={privacySignal} onClick={() => setMarketingConsent("granted")}>Accept marketing</button>
      </div>
    </div>
  );
}