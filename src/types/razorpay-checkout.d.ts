/**
 * Razorpay Checkout as loaded from checkout.razorpay.com.
 *
 * The npm `razorpay` package is the server SDK only — the browser widget is a
 * script tag, so it gets a minimal local typing instead of a dependency.
 */

export {};

interface RazorpayCheckoutPayment {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler?: (payment: RazorpayCheckoutPayment) => void;
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean };
  retry?: { enabled?: boolean };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}
