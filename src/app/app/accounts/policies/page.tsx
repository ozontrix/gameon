'use client';

/**
 * Policies — the web twin of the handset app's `accounts/policies.tsx`.
 *
 * §10 describes these as static informational pages, so each row opens to its
 * clauses in place rather than pushing another screen. Every word comes from
 * `constants/policies.ts`, which is the written brief's own wording.
 */

import { useState } from 'react';

import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { Card, Ion, PressableScale, type IonName } from '@/components/mobile/ui';
import { FACILITY_POLICY_DETAILS } from '@/lib/mobile/constants/policies';
import { Brand, Radius, Spacing } from '@/lib/mobile/theme';

/** Icon per policy, in the order the mockup lists them. */
const ICONS: Record<string, IonName> = {
  booking: 'calendarOutline',
  cancellation: 'closeCircleOutline',
  refund: 'cashOutline',
  payment: 'cardOutline',
  conduct: 'shieldCheckmarkOutline',
};

export default function PoliciesPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ScreenShell>
      <ScreenTitle
        title="Policies"
        subtitle="Our policies ensure a safe and fair experience for everyone."
      />

      <Card padded={false}>
        {FACILITY_POLICY_DETAILS.map((policy, index) => {
          const open = openKey === policy.key;
          return (
            <div key={policy.key}>
              <PressableScale
                as="div"
                scale={false}
                label={policy.title}
                onPress={() => setOpenKey(open ? null : policy.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: Spacing.md,
                  padding: Spacing.md,
                  borderTop: index > 0 ? `1px solid ${Brand.divider}` : 'none',
                  background: 'none',
                  width: '100%',
                }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: Radius.md,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Brand.accentSoft,
                  }}>
                  <Ion name={ICONS[policy.key] ?? 'documentTextOutline'} size={20} color={Brand.accent} />
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: Spacing.xxs,
                    textAlign: 'left',
                  }}>
                  <span style={{ color: Brand.text, fontSize: 14, fontWeight: 700 }}>
                    {policy.title}
                  </span>
                  <span style={{ color: Brand.textSecondary, fontSize: 12, lineHeight: '16px' }}>
                    {policy.summary}
                  </span>
                </span>
                <Ion
                  name={open ? 'chevronDown' : 'chevronForward'}
                  size={18}
                  color={Brand.accent}
                />
              </PressableScale>

              {open ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: Spacing.sm,
                    backgroundColor: Brand.background,
                    paddingLeft: Spacing.md,
                    paddingRight: Spacing.md,
                    paddingTop: Spacing.sm,
                    paddingBottom: Spacing.md,
                  }}>
                  {policy.clauses.map((clause) => (
                    <div key={clause} style={{ display: 'flex', gap: Spacing.sm }}>
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: Radius.pill,
                          marginTop: 7,
                          flexShrink: 0,
                          backgroundColor: Brand.accent,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          color: Brand.textSecondary,
                          fontSize: 12,
                          lineHeight: '17px',
                        }}>
                        {clause}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>
    </ScreenShell>
  );
}
