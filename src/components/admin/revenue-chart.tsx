import { formatDate, formatMoney } from '@/lib/admin/format';

/**
 * Deep amber from the GameOn brand family (#B86E00, hover #8F5500). The raw brand
 * amber (#F5A623) is too light for data marks on white (2:1); this step passes the
 * palette validator's lightness band and 3:1 contrast against the card surface.
 * Written as literal classes so Tailwind generates them.
 */
const BAR_CLASSES = 'bg-[#B86E00] group-hover:bg-[#8F5500] group-focus-visible:bg-[#8F5500]';

/** A round axis maximum and step giving 3–5 gridlines. */
function niceScale(max: number) {
  if (max <= 0) return { top: 1000, step: 250 };
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  return { top: Math.ceil(max / step) * step, step };
}

/** ₹0, ₹750, ₹1.5k, ₹12k, ₹1.2L */
function shortMoney(value: number) {
  if (value >= 100_000) return `₹${+(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${+(value / 1_000).toFixed(1)}k`;
  return `₹${value}`;
}

/**
 * Paid revenue per play date as a column chart. Server-rendered; each column is
 * focusable and shows its value on hover or keyboard focus, and the same numbers
 * are available in the table view underneath.
 */
export function RevenueChart({ days, today }: { days: { date: string; amount: number }[]; today: string }) {
  const max = Math.max(0, ...days.map((d) => d.amount));
  const { top, step } = niceScale(max);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = max > 0 ? days.findIndex((d) => d.amount === max) : -1;

  return (
    <div>
      <div className="flex gap-3">
        {/* Y axis */}
        <div className="relative h-48 w-12 shrink-0 text-right text-[11px] tabular-nums text-zinc-500" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(tick / top) * 100}%` }}>
              {shortMoney(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Plot */}
          <div className="relative h-48" role="list" aria-label="Paid revenue per day, last 14 days">
            {ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden
                className={tick === 0 ? 'absolute inset-x-0 h-px bg-zinc-300' : 'absolute inset-x-0 h-px bg-zinc-100'}
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex">
              {days.map((day, index) => {
                const height = (day.amount / top) * 100;
                const label = `${formatDate(day.date, { year: false })}: ${formatMoney(day.amount)}`;
                return (
                  <div
                    key={day.date}
                    role="listitem"
                    tabIndex={0}
                    aria-label={label}
                    className="group relative flex h-full flex-1 items-end justify-center outline-none"
                  >
                    {day.amount > 0 ? (
                      <div
                        className={`w-full max-w-6 rounded-t-[4px] transition-colors ${BAR_CLASSES}`}
                        style={{ height: `${height}%` }}
                      />
                    ) : null}

                    {index === peak ? (
                      <span
                        className="pointer-events-none absolute text-[11px] font-medium text-zinc-700 group-hover:invisible group-focus-visible:invisible"
                        style={{ bottom: `calc(${height}% + 4px)` }}
                        aria-hidden
                      >
                        {shortMoney(day.amount)}
                      </span>
                    ) : null}

                    <div
                      role="tooltip"
                      className="pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-md bg-zinc-950 px-2.5 py-1.5 text-left shadow-lg group-hover:block group-focus-visible:block"
                      style={{ bottom: `calc(${height}% + 8px)` }}
                    >
                      <span className="block text-sm font-semibold text-white">{formatMoney(day.amount)}</span>
                      <span className="block text-[11px] text-zinc-400">{formatDate(day.date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X axis */}
          <div className="mt-2 flex text-[11px] tabular-nums text-zinc-500" aria-hidden>
            {days.map((day) => (
              <span key={day.date} className={`flex-1 text-center ${day.date === today ? 'font-semibold text-zinc-900' : ''}`}>
                {Number(day.date.slice(8))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {max === 0 ? <p className="mt-3 text-sm text-zinc-500">No paid bookings played in the last 14 days.</p> : null}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900">View as table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="text-xs text-zinc-500">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 text-right font-medium">Paid revenue</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-t border-zinc-100">
                <td className="py-1">{formatDate(day.date)}</td>
                <td className="py-1 text-right tabular-nums">{formatMoney(day.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
