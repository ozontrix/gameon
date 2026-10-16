'use client';

/**
 * The Events tab — the web twin of the app `app/(tabs)/events.tsx`.
 *
 * Two rails on one screen: events and tournaments are separate resources with
 * separate capacities, but a player looking for "what is on" wants to see both.
 * Both reads are public, so a guest gets the same list a member does.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ListingCard, type Listing } from '@/components/mobile/events/listing-card';
import {
  AppHeader,
  Card,
  EmptyState,
  InfoNote,
  Ion,
  Screen,
  ScreenScroll,
  SegmentedTabs,
  Skeleton,
} from '@/components/mobile/ui';
import { useApi } from '@/lib/mobile/use-api';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

type Tab = 'events' | 'tournaments';

const TABS = [
  { key: 'events' as Tab, label: 'Events', icon: 'trophyOutline' as const },
  { key: 'tournaments' as Tab, label: 'Tournaments', icon: 'trophy' as const },
];

export default function EventsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('events');
  const events = useApi<Listing[]>('/public/events');
  const tournaments = useApi<Listing[]>('/public/tournaments');

  const active = tab === 'events' ? events : tournaments;
  const items = active.data ?? [];

  return (
    <Screen>
      <AppHeader />
      <ScreenScroll bottomLayer="tabBar" gap={Spacing.md}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>Events</span>
          <span style={{ ...Typography.body, color: Brand.textSecondary }}>
            What&apos;s on at GameOn — and how to get in.
          </span>
        </div>

        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

        {/*
          The handset's own shortcut, in the same place: the list is what is on,
          this is what you already hold.
        */}
        <Card
          onPress={() => router.push('/app/my-tickets')}
          accessibilityLabel="My tickets and tournament entries"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: Spacing.md,
            borderColor: Brand.accent,
          }}>
          <span
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: Radius.pill,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: Brand.accentSoft,
            }}>
            <Ion name="ticketOutline" size={17} color={Brand.accent} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...Typography.label, color: Brand.text, display: 'block' }}>
              My Tickets &amp; Entries
            </span>
            <span style={{ ...Typography.caption, color: Brand.textMuted, display: 'block' }}>
              Event tickets and tournament teams you have already bought
            </span>
          </span>
          <Ion name="chevronForward" size={16} color={Brand.textSecondary} />
        </Card>

        {active.error ? (
          <InfoNote
            body={active.error}
            tone="danger"
            title={tab === 'events' ? 'Could not load events' : 'Could not load tournaments'}
          />
        ) : null}

        {active.loading && items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <Skeleton height={240} radius={Radius.lg} />
            <Skeleton height={240} radius={Radius.lg} />
          </div>
        ) : null}

        {!active.loading && items.length === 0 ? (
          <EmptyState
            icon="trophyOutline"
            title={tab === 'events' ? 'Nothing scheduled yet' : 'No tournaments open yet'}
            body="Published events appear here as soon as they open for entry."
            actionLabel="Refresh"
            onAction={() => void active.refetch()}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} kind={tab === 'events' ? 'event' : 'tournament'} />
          ))}
        </div>
      </ScreenScroll>
    </Screen>
  );
}
