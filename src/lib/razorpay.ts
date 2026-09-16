import crypto from 'crypto';
import Razorpay from 'razorpay';

let client: Razorpay | null = null;

/**
 * The Razorpay client, created on first use so `next build` can import the
 * payment routes without the keys being present.
 */
export function getRazorpay(): Razorpay {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

function hmacMatches(payload: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(payload).digest('hex'));
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

/** The signature Razorpay Checkout hands back after a successful payment. */
export function isValidPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_SECRET.');
  return hmacMatches(`${orderId}|${paymentId}`, signature, secret);
}

/** The `X-Razorpay-Signature` header on a webhook, computed over the raw body. */
export function isValidWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  return hmacMatches(rawBody, signature, secret);
}
