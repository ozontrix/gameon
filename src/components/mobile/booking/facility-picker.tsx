'use client';

/**
 * The court chips inside booking step 1 — the web twin of the app
 * `components/booking/facility-picker.tsx`.
 *
 * A court is a `facilities` row: the individual unit inside the court type the
 * card describes. The server scopes this list to the card's court type, so
 * nothing here filters.
 */

import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { Chip } from '../ui';

export type Facility = {
  id: string;
  name: string;
  is_indoor: boolean;
  has_ac: boolean;
  surface_type: string;
};

export function FacilityPicker({
  value,
  onChange,
  facilities = [],
}: {
  value: string | undefined;
  onChange: (facilityId: string) => void;
  facilities?: Facility[];
}) {
  if (facilities.length === 0) {
    return (
      <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
        No facilities available.
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
      <span style={{ ...Typography.caption, color: Brand.textSecondary }}>Choose a Court</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
        {facilities.map((facility) => {
          const selected = value === facility.id;
          return (
            <Chip
              key={facility.id}
              label={facility.name}
              size="sm"
              variant="outline"
              selected={selected}
              trailing={selected ? 'check' : 'none'}
              onPress={() => onChange(facility.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
