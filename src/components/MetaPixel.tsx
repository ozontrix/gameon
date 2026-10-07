"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { findSport } from "@/components/league/data";
import {
  browserPrivacySignal, configureMetaPixel, getMarketingConsent, getServerMarketingConsent, initializeMetaPixel,
  isPublicTrackingPath, MARKETING_CONSENT_KEY, pauseMetaPixel, refreshMarketingConsent,
  setMarketingConsent, subscribeMarketingConsent, trackMetaEvent, trackMetaPageView,
} from "@/lib/analytics/meta-pixel";

/** Root-level SPA tracking; never render a consent-bypassing noscript pixel. */
export function MetaPixel({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeMarketingConsent, getMarketingConsent, getServerMarketingConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const publicPage = isPublicTrackingPath(pathname);

  useEffect(() => {
    configureMetaPixel(enabled);
    queueMicrotask(refreshMarketingConsent);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === MARKETING_CONSENT_KEY || event.key === null) refreshMarketingConsent();
    };
    window.addEventListener("storage", storageChanged);
    return () => window.removeEventListener("storage", storageChanged);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !publicPage || consent !== "granted") { pauseMetaPixel(); return; }
    initializeMetaPixel();
    if (!trackMetaPageView(pathname)) return;
    if (pathname === "/gameon-multisports-league" || pathname === "/gameon-multisports-league/") {
      trackMetaEvent("ViewContent", { content_name: "GameOn Multisports League", content_category: "Sports league" });
    } else if (pathname === '/open-play-registrations' || pathname === '/open-play-registrations/') {
      trackMetaEvent('ViewContent', { content_name: 'GameOn Free Open Play', content_category: 'Open play', content_ids: ['open-play:2026-10-18'] });
    } else {
      const match = /^\/gameon-multisports-league\/sports\/([^/]+)\/?$/.exec(pathname);
      const sport = match ? findSport(match[1]) : null;
      if (sport) trackMetaEvent("ViewContent", {
        content_name: sport.name, content_category: "Sports league", content_type: "product_group",
        content_ids: [`league:${sport.id}`],
      });
    }
  }, [enabled, publicPage, consent, pathname]);

  if (!enabled || !publicPage) return null;
  const choose = (choice: "granted" | "denied") => { setMarketingConsent(choice); setSettingsOpen(false); };
  const privacySignal = consent !== "unknown" && browserPrivacySignal();
  const buttonClass = "min-h-11 cursor-pointer rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand";
  return (
    <>
      {consent === "granted" ? <Script id="gameon-meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" /> : null}
      {consent === "unknown" || settingsOpen ? (
        <section aria-label="Marketing cookie preferences" className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[110] mx-auto max-w-lg rounded-2xl border border-white/20 bg-go-black p-5 text-go-white shadow-2xl sm:left-auto sm:right-5 sm:mx-0">
          <h2 className="text-base font-semibold">Marketing cookies</h2>
          <p className="mt-2 text-sm leading-relaxed text-go-off">With your permission, we use Meta Pixel to measure visits and registrations and improve our Facebook and Instagram ads. Registration and booking work without it.</p>
          <Link href="/privacy" className="mt-2 inline-block py-2 text-sm text-go-brand underline focus-visible:outline-2 focus-visible:outline-go-brand">Privacy policy</Link>
          {privacySignal ? <p className="mt-2 text-sm">Your browser privacy signal keeps marketing tracking disabled.</p> : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={buttonClass} onClick={() => choose("denied")}>Reject marketing</button>
            <button type="button" className={`${buttonClass} border-go-brand bg-go-brand text-go-black hover:bg-go-brand/90 disabled:cursor-not-allowed disabled:opacity-50`} disabled={privacySignal} onClick={() => choose("granted")}>Accept marketing</button>
          </div>
        </section>
      ) : null}
      {consent !== "unknown" && !settingsOpen ? <button type="button" onClick={() => setSettingsOpen(true)} className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-[100] min-h-11 cursor-pointer rounded-xl border border-white/25 bg-go-black px-3 text-xs text-go-white shadow-lg hover:bg-go-black/90 focus-visible:outline-2 focus-visible:outline-go-brand">Cookie settings</button> : null}
    </>
  );
}