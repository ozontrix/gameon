'use client';

/**
 * The filter row above the transactions table — the web twin of the handset app's
 * `components/transactions/filter-chips.tsx`.
 *
 * Every filter is applied by the *server* before it paginates, so a chip changes
 * what is fetched rather than what is hidden: "Refunds" shows twenty refunds, not
 * the refunds that happened to be in the last twenty rows.
 */

import { Chip } from '@/components/mobile/ui';
import { TXN_FILTERS, type TxnFilter } from '@/lib/mobile/constants/transactions';
import { Spacing } from '@/lib/mobile/theme';

export function FilterChips({
  active,
  onChange,
}: {
  active: TxnFilter;
  onChange: (filter: TxnFilter) => void;
}) {
  return (
    <div
      className="mobile-scroll"
      role="tablist"
      aria-label="Filter transactions"
      style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
      {TXN_FILTERS.map((filter) => (
        <Chip
          key={filter.key}
          label={filter.label}
          size="sm"
          selected={active === filter.key}
          onPress={() => onChange(filter.key)}
        />
      ))}
    </div>
  );
}
