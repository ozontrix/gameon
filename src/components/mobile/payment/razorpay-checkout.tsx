'use client';

/**
 * Razorpay's checkout, on the web.
 *
 * The handset build renders the gateway in a WebView (and uses the native SDK on
 * Android); a browser gets Razorpay's own hosted modal by loading its
 * `checkout.js` once and opening it. That is why this component renders nothing:
 * on the web the gateway owns the surface, and all this does is hand it the order
 * and route the callbacks back.
 *
 * The whole component is inert until `options` is non-null, which is how the
 * payment screen controls when the modal appears.
 */

import { useEffect, useRef } from 'react';

import { RAZORPAY_THEME_COLOR } from '@/lib/mobile/constants/payment';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** What the gateway hands back once a payment succeeds. */
export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/** The subset of Razorpay's options this app sets. */
export type RazorpayOptions = {
  description: string;
  currency: string;
  /** The publishable key, from the server's create-order response. */
  key: string;
  /** Amount in paise. */
  amount: number;
  name: string;
  order_id: string;
  /**
   * What the gateway pre-fills. Every field is optional: an event order has no
   * email when the buyer left it blank, and Razorpay asks for whatever is missing.
   */
  prefill: { name?: string; email?: string; contact?: string };
  theme: { color: string };
};

/**
 * The pieces of the gateway's own API this app touches. The global
 * `window.Razorpay` typing lives in `src/types/razorpay-checkout.d.ts`, shared
 * with the site's other checkout.
 */

let scriptPromise: Promise<boolean> | null = null;

/** Loads `checkout.js` once per page, however many checkouts are opened. */
function loadCheckout(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function RazorpayCheckout({
  options,
  onSuccess,
  onDismiss,
  onFailed,
}: {
  /** Non-null opens the modal. The payment screen clears it to close. */
  options: RazorpayOptions | null;
  onSuccess: (result: RazorpaySuccess) => void;
  /** The player closed the modal without paying. */
  onDismiss: () => void;
  onFailed: (message: string) => void;
}) {
  /**
   * The gateway holds its callbacks for as long as the modal is open, so they are
   * read from a ref rather than captured: a new callback identity on each render
   * of the payment screen (a spinner flipping, a notice appearing) must not be
   * allowed to re-open the modal or speak to a stale screen.
   */
  const handlers = useRef({ onSuccess, onDismiss, onFailed });
  useEffect(() => {
    handlers.current = { onSuccess, onDismiss, onFailed };
  });

  /** The order currently on screen, so one order is never opened twice. */
  const openedOrder = useRef<string | null>(null);

  useEffect(() => {
    if (!options) return;
    if (openedOrder.current === options.order_id) return;
    openedOrder.current = options.order_id;

    let cancelled = false;

    void (async () => {
      const ready = await loadCheckout();
      if (cancelled) return;
      if (!ready || !window.Razorpay) {
        openedOrder.current = null;
        handlers.current.onFailed(
          'The payment window could not be loaded. Check your connection and try again.',
        );
        return;
      }

      const instance = new window.Razorpay({
        ...options,
        theme: { color: options.theme.color || RAZORPAY_THEME_COLOR },
        handler: (response: RazorpaySuccess) => handlers.current.onSuccess(response),
        modal: { ondismiss: () => handlers.current.onDismiss() },
      });

      instance.on?.('payment.failed', (response) => {
        handlers.current.onFailed(response.error?.description ?? 'That payment did not go through.');
      });

      instance.open();
    })();

    return () => {
      cancelled = true;
    };
  }, [options]);

  return null;
}
