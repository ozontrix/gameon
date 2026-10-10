import { getRazorpay } from '../razorpay';

export class PaymentValidationError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

/** A checkout signature is not proof of capture; validate with the gateway. */
export async function assertCapturedPayment(
  orderId: string,
  paymentId: string,
  amountInPaise: number,
  recordedPaymentId: string | null
): Promise<void> {
  if (recordedPaymentId && recordedPaymentId !== paymentId) {
    throw new PaymentValidationError('A different payment is already recorded for this purchase.');
  }
  if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
    throw new PaymentValidationError('This purchase has no valid gateway amount.');
  }

  const payment = await getRazorpay().payments.fetch(paymentId);
  if (payment.id !== paymentId || payment.order_id !== orderId ||
      Number(payment.amount) !== amountInPaise || payment.currency !== 'INR') {
    throw new PaymentValidationError('The payment does not match this purchase.');
  }
  if (payment.status !== 'captured' || Number(payment.amount_refunded ?? 0) !== 0) {
    throw new PaymentValidationError('Payment is not captured or has been refunded. Please refresh its status; do not pay again.');
  }
}