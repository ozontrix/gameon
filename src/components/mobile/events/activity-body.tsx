'use client';

/**
 * Everything below the hero on both detail screens: the description, a facts card
 * built from the API's own fields, and the free-form sections an admin wrote in
 * the panel. Shared, so an event and a tournament cannot drift apart — the web
 * twin of the handset app's `components/events/activity-body.tsx`.
 *
 * There is no prize list or rules table hardcoded here: those are
 * `tournament_sections` / `event_sections` rows.
 */

import type { ReactNode } from 'react';

import { Card, DetailRow, Ion } from '@/components/mobile/ui';
import {
  dateRangeLabel,
  entryFeeLabel,
  placeUnit,
  spotsLeft,
  timeRangeLabel,
  type PublicActivity,
} from '@/lib/mobile/constants/events';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
      <span style={{ ...Typography.blockTitle, color: Brand.text }}>{title}</span>
      {children}
    </div>
  );
}

export function ActivityBody({ activity }: { activity: PublicActivity }) {
  const left = spotsLeft(activity);
  const isTournament = activity.kind === 'tournament';

  return (
    <>
      {activity.description ? (
        <Block title={isTournament ? 'Tournament Overview' : 'About the Event'}>
          <span style={{ ...Typography.body, color: Brand.textSecondary }}>
            {activity.description}
          </span>
        </Block>
      ) : null}

      <Card>
        <span style={{ ...Typography.blockTitle, color: Brand.text }}>Details</span>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.sm,
            paddingTop: Spacing.md,
          }}>
          <DetailRow
            label="Dates"
            value={dateRangeLabel(activity)}
            icon={<Ion name="calendarOutline" size={13} color={Brand.textSecondary} />}
          />
          <DetailRow
            label="Daily timings"
            value={timeRangeLabel(activity)}
            icon={<Ion name="timeOutline" size={13} color={Brand.textSecondary} />}
          />
          <DetailRow
            label="Venue"
            value={[activity.venue, activity.address].filter(Boolean).join(', ')}
            icon={<Ion name="location" size={13} color={Brand.textSecondary} />}
          />
          {isTournament && activity.courtTypeSummary ? (
            <DetailRow
              label="Court"
              value={activity.courtTypeSummary}
              icon={<Ion name="layersOutline" size={13} color={Brand.textSecondary} />}
            />
          ) : null}
          {isTournament && activity.teamSize ? (
            <DetailRow
              label="Team size"
              value={activity.teamSize}
              icon={<Ion name="peopleOutline" size={13} color={Brand.textSecondary} />}
            />
          ) : null}
          {activity.format ? (
            <DetailRow
              label="Format"
              value={activity.format}
              icon={<Ion name="trophy" size={13} color={Brand.textSecondary} />}
            />
          ) : null}
          <DetailRow
            label="Entry"
            value={entryFeeLabel(activity)}
            icon={<Ion name="pricetagOutline" size={13} color={Brand.textSecondary} />}
            emphasis="accent"
          />
          <DetailRow
            label={isTournament ? 'Team slots' : 'Tickets'}
            value={
              left > 0
                ? `${left} of ${activity.capacity} ${placeUnit(activity, left)} left`
                : 'Sold out'
            }
            icon={<Ion name="ticketOutline" size={13} color={Brand.textSecondary} />}
          />
        </div>
      </Card>

      {activity.sections.map((section) => (
        <Block key={section.key} title={section.title}>
          <span style={{ ...Typography.body, color: Brand.textSecondary }}>{section.body}</span>
        </Block>
      ))}
    </>
  );
}
