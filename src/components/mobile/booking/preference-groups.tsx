'use client';

/**
 * The court-preference rows — floor type, setting and climate — each a label
 * beside a set of single-choice chips. The web twin of the app
 * `components/booking/preference-groups.tsx`.
 *
 * These are preferences the player records for the venue's benefit; they do not
 * filter anything, and the screen that uses them says so.
 */

import {
  PREFERENCE_GROUPS,
  type PreferenceGroup,
  type PreferenceIcon,
} from '@/lib/mobile/constants/slots';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { Chip, Ion, Mdi } from '../ui';

/** The current choice for each preference group, keyed by group. */
export type Preferences = Record<PreferenceGroup['key'], string>;

function PreferenceGlyph({ icon }: { icon: PreferenceIcon }) {
  return icon.family === 'mdi' ? (
    <Mdi name={icon.name} size={14} color={Brand.accent} />
  ) : (
    <Ion name={icon.name} size={14} color={Brand.accent} />
  );
}

export function PreferenceGroups({
  value,
  onChange,
  groups = PREFERENCE_GROUPS,
}: {
  value: Preferences;
  onChange: (key: PreferenceGroup['key'], option: string) => void;
  groups?: PreferenceGroup[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
      {groups.map((group) => (
        <div
          key={group.key}
          style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <span style={{ ...Typography.caption, color: Brand.textSecondary, width: 52 }}>
            {group.label}
          </span>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
            {group.options.map((option) => {
              const selected = value[group.key] === option.key;
              return (
                <Chip
                  key={option.key}
                  label={option.label}
                  icon={<PreferenceGlyph icon={option.icon} />}
                  size="sm"
                  variant="outline"
                  selected={selected}
                  trailing={selected ? 'check' : 'none'}
                  onPress={() => onChange(group.key, option.key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
