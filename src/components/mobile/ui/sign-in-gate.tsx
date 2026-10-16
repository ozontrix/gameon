'use client';

/**
 * Shown in place of a member-only screen's content while browsing as a guest.
 * The tab bar stays visible behind it, so the guest can move on without feeling
 * ejected from the app. The web twin of the app `components/ui/sign-in-gate.tsx`.
 */

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Button } from './button';
import { Ion, type IonName } from './icons';
import { BottomSheet } from './bottom-sheet';

export function SignInGate({
  icon = 'personCircleOutline',
  title,
  body,
  /** Where "Keep browsing" sends the guest. Defaults to the Sports tab. */
  browseHref = '/app/sports',
  browseLabel = 'Keep browsing',
  leading,
}: {
  icon?: IonName;
  title: string;
  body: string;
  browseHref?: string;
  browseLabel?: string;
  leading?: ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: Spacing.md,
        paddingTop: Spacing.five,
        paddingBottom: Spacing.five,
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.lg,
      }}>
      <span
        style={{
          width: 72,
          height: 72,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Brand.accentSoft,
          color: Brand.accent,
        }}>
        {leading ?? <Ion name={icon} size={34} color={Brand.accent} />}
      </span>

      <span style={{ ...Typography.sectionTitle, color: Brand.text }}>{title}</span>
      <span style={{ ...Typography.body, color: Brand.textSecondary, maxWidth: 320 }}>{body}</span>

      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.sm,
          paddingTop: Spacing.sm,
        }}>
        <Button
          label="Sign in or sign up"
          icon={<Ion name="logInOutline" size={16} color={Brand.onAccent} />}
          onPress={() => router.replace('/app')}
          fullWidth
        />
        <Button
          label={browseLabel}
          variant="secondary"
          onPress={() => router.replace(browseHref)}
          fullWidth
        />
      </div>
    </div>
  );
}

/**
 * The inline version, for when a guest reaches a member-only action rather than
 * a member-only screen — tapping Book Now, say.
 */
export function SignInSheet({
  visible,
  onClose,
  title = 'Sign in to book',
  body = 'Booking a slot needs a verified mobile number, so we can send your confirmation and reminders. It only takes a moment.',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
}) {
  const router = useRouter();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle="You're browsing as a guest"
      footer={
        <>
          <Button label="Not now" variant="secondary" size="md" onPress={onClose} style={{ flex: 1 }} />
          <Button
            label="Sign in"
            size="md"
            icon={<Ion name="logInOutline" size={16} color={Brand.onAccent} />}
            onPress={() => {
              onClose();
              router.replace('/app');
            }}
            style={{ flex: 1 }}
          />
        </>
      }>
      <span style={{ ...Typography.body, color: Brand.textSecondary }}>{body}</span>
    </BottomSheet>
  );
}
