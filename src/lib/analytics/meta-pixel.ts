/** Browser-only, consent-gated Meta events. Analytics must never break checkout. */
import type { LeagueConfirmation } from "@/lib/league/confirmation";

export const META_PIXEL_ID = "1044470925231458";
export const MARKETING_CONSENT_KEY = "gameon-marketing-consent-v1";
export const META_PURCHASES_KEY = "gameon-meta-purchases-v1";
export const META_CONSENT_EVENT = "gameon:marketing-consent";
export type MarketingConsent = "unknown" | "granted" | "denied";
export type MetaEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase" | "Lead";
type PixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: PixelFunction;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window { fbq?: PixelFunction; _fbq?: PixelFunction }
}

let consent: MarketingConsent = "unknown";
let initialized = false;
let deploymentEnabled = false;
let lastPage: string | null = null;
const sentPurchases = new Set<string>();
const sentPaymentInfo = new Set<string>();

export function isPublicTrackingPath(path: string): boolean {
  return !/^\/(admin|api|email-confirmed|delete-account)(\/|$)/.test(path);
}

export function metaTrackingEnabled(): boolean {
  return deploymentEnabled && process.env.NODE_ENV === "production";
}

/** Server-provided deployment flag also gates event handlers, not only script rendering. */
export function configureMetaPixel(enabled: boolean): void {
  deploymentEnabled = enabled;
  if (!enabled && typeof window !== "undefined") pauseMetaPixel();
}

export function browserPrivacySignal(): boolean {
  return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function getMarketingConsent(): MarketingConsent { return consent; }
export function getServerMarketingConsent(): MarketingConsent { return "unknown"; }

export function subscribeMarketingConsent(listener: () => void): () => void {
  window.addEventListener(META_CONSENT_EVENT, listener);
  return () => window.removeEventListener(META_CONSENT_EVENT, listener);
}

export function refreshMarketingConsent(): void {
  try {
    const saved = window.localStorage.getItem(MARKETING_CONSENT_KEY);
    consent = saved === "granted" || saved === "denied" ? saved : "unknown";
  } catch { consent = "unknown"; }
  if (browserPrivacySignal()) consent = "denied";
  if (consent !== "granted") pauseMetaPixel();
  window.dispatchEvent(new Event(META_CONSENT_EVENT));
}

export function setMarketingConsent(choice: "granted" | "denied"): void {
  consent = browserPrivacySignal() ? "denied" : choice;
  try { window.localStorage.setItem(MARKETING_CONSENT_KEY, consent); } catch { /* In-memory choice still works. */ }
  if (consent !== "granted") pauseMetaPixel();
  window.dispatchEvent(new Event(META_CONSENT_EVENT));
}

export function pauseMetaPixel(): void {
  lastPage = null;
  try { window.fbq?.("consent", "revoke"); } catch { /* Optional third-party script. */ }
}

function canTrack(): boolean {
  return typeof window !== "undefined" && metaTrackingEnabled() && consent === "granted"
    && !browserPrivacySignal() && isPublicTrackingPath(window.location.pathname);
}

/** Same queue as Meta's base snippet; no request is made until the consented Script loads. */
export function initializeMetaPixel(): boolean {
  if (!canTrack()) return false;
  try {
    if (!window.fbq) {
      const pixel: PixelFunction = Object.assign(function (...args: unknown[]) {
        if (pixel.callMethod) pixel.callMethod(...args);
        else pixel.queue.push(args);
      }, { queue: [] as unknown[][] });
      pixel.push = pixel;
      pixel.loaded = true;
      pixel.version = "2.0";
      window.fbq = pixel;
      window._fbq = pixel;
    }
    if (!initialized) {
      window.fbq("consent", "revoke");
      // Only explicitly instrumented events; never auto-detect checkout form fields.
      window.fbq("set", "autoConfig", false, META_PIXEL_ID);
      window.fbq("init", META_PIXEL_ID);
      initialized = true;
    }
    window.fbq("consent", "grant");
    return true;
  } catch { return false; }
}

export function trackMetaEvent(event: MetaEvent, parameters: Record<string, unknown> = {}, eventId?: string): boolean {
  try {
    if (!initializeMetaPixel()) return false;
    window.fbq!("trackSingle", META_PIXEL_ID, event, parameters, ...(eventId ? [{ eventID: eventId }] : []));
    return true;
  } catch { return false; }
}

/** Path changes only: query strings/checkout contacts are never custom event parameters. */
export function trackMetaPageView(pathname: string): boolean {
  if (!isPublicTrackingPath(pathname) || pathname === lastPage) return false;
  if (!trackMetaEvent("PageView")) return false;
  lastPage = pathname;
  return true;
}

type AnalyticsCategory = { id: string; sportId?: string; fee?: number };
export function leagueEventParameters(categories: AnalyticsCategory[], value: number, fallbackSport = "league"): Record<string, unknown> {
  const contents = categories.map(category => ({
    id: `league:${category.sportId ?? fallbackSport}:${category.id}`,
    quantity: 1,
    ...(category.fee !== undefined ? { item_price: category.fee } : {}),
  }));
  return {
    content_name: "GameOn Multisports League", content_type: "product",
    content_ids: contents.map(item => item.id), contents, num_items: contents.length,
    currency: "INR", value,
  };
}

/** Razorpay has returned payment details, but Purchase still awaits server verification. */
export function trackLeaguePaymentInfo(orderId: string, categories: AnalyticsCategory[], amountPaise: number): boolean {
  if (!orderId || sentPaymentInfo.has(orderId)) return false;
  if (!trackMetaEvent("AddPaymentInfo", leagueEventParameters(categories, amountPaise / 100), `league-payment-info:${orderId}`)) return false;
  sentPaymentInfo.add(orderId);
  return true;
}

/** Call only after the confirm API verifies signature, captured status, order and amount. */
export function trackLeaguePurchase(confirmation: LeagueConfirmation): boolean {
  try {
    if (!confirmation.paymentId || !confirmation.orderId || !confirmation.paidAt
      || !Number.isFinite(confirmation.amount) || confirmation.amount <= 0 || confirmation.currency !== "INR") return false;
    const eventId = `league-purchase:${confirmation.orderId}`;
    if (sentPurchases.has(eventId)) return false;
    let stored: string[] = [];
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(META_PURCHASES_KEY) ?? "[]");
      if (Array.isArray(parsed)) stored = parsed.filter((id): id is string => typeof id === "string");
    } catch { /* Storage blocked: memory and Meta eventID are the fallback. */ }
    if (stored.includes(eventId)) return false;
    if (!trackMetaEvent("Purchase", {
      ...leagueEventParameters(confirmation.entry.categories, confirmation.amount, confirmation.entry.sport),
      currency: confirmation.currency,
    }, eventId)) return false;
    sentPurchases.add(eventId);
    try { window.localStorage.setItem(META_PURCHASES_KEY, JSON.stringify([...stored, eventId].slice(-1000))); } catch { /* Non-blocking. */ }
    return true;
  } catch { return false; }
}