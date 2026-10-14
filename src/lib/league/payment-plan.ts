/** Payment arithmetic uses integer paise; the booking total is never discounted by a deposit. */
export type LeaguePaymentPlan = 'FULL' | 'DEPOSIT_20';

export function leaguePaymentSchedule(total: number, plan: LeaguePaymentPlan = 'FULL') {
  const totalPaise = Math.round(total * 100);
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 0) throw new Error('Invalid League total.');
  const dueNowPaise = plan === 'DEPOSIT_20' ? Math.round(totalPaise / 5) : totalPaise;
  return { plan, totalPaise, dueNowPaise, balancePaise: totalPaise - dueNowPaise };
}

/** Keep paise visible on payment amounts instead of rounding a discounted deposit to rupees. */
export function formatLeaguePayment(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}