'use client';

/**
 * Date and time as one element: a month calendar that becomes the slot picker once
 * a day is chosen, and goes back on request — the web twin of the app
 * `components/booking/date-slot-picker.tsx`. One decision at a time, at a
 * constant height, so switching panes never resizes the page under the thumb.
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { price } from '@/lib/mobile/constants/config';
import { dateKeyOf, durationLabel, startOfToday, type TimeSlot } from '@/lib/mobile/constants/slots';
import type { SlotOption } from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Chip, Ion, PressableScale, Spinner } from '../ui';
import { SlotGrid } from './slot-grid';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const COLUMNS = 7;
/** Six rows always, so the height never changes between months. */
const ROWS = 6;

/** One frame for both panes, so switching between them never resizes the page. */
const FRAME_HEIGHT = 326;

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** Every cell of a month's grid, padded to six whole weeks. */
function buildMonth(year: number, month: number): (Date | null)[] {
  const lead = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= length; day += 1) cells.push(new Date(year, month, day));
  while (cells.length < ROWS * COLUMNS) cells.push(null);
  return cells;
}

export type DateSlotPickerProps = {
  /** Chosen day, `YYYY-MM-DD`. */
  date: string;
  onChangeDate: (key: string) => void;
  /** How far ahead the venue takes bookings, today counting as day 1. */
  daysAhead: number;
  slots: TimeSlot[];
  slotKey?: string;
  onChangeSlot: (key: string) => void;
  loading?: boolean;
  error?: string | null;
  /** True once a date has been chosen, so the frame shows its slots. */
  showSlots: boolean;
  onShowSlots: (show: boolean) => void;
  /** The lengths this card sells. Shown above the slots when there is a choice. */
  slotOptions: SlotOption[];
  slotMinutes?: number;
  onChangeSlotLength: (minutes: number) => void;
};

export function DateSlotPicker({
  date,
  onChangeDate,
  daysAhead,
  slots,
  slotKey,
  onChangeSlot,
  loading = false,
  error = null,
  showSlots,
  onShowSlots,
  slotOptions,
  slotMinutes,
  onChangeSlotLength,
}: DateSlotPickerProps) {
  const today = startOfToday();
  const selected = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const [cursor, setCursor] = useState(() => monthStart(selected));

  // The last day on sale, from the venue's own window.
  const last = useMemo(() => {
    const end = new Date(today);
    end.setDate(today.getDate() + Math.max(daysAhead, 1) - 1);
    return end;
  }, [today, daysAhead]);

  const cells = useMemo(() => buildMonth(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const canGoBack = cursor > monthStart(today);
  const canGoForward = cursor < monthStart(last);
  const step = (months: number) =>
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));

  const selectedLabel = selected.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const free = slots.filter((slot) => slot.available).length;

  const frame: CSSProperties = { height: FRAME_HEIGHT, display: 'flex', flexDirection: 'column' };

  if (showSlots) {
    return (
      <div style={frame}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: Spacing.sm,
          }}>
          <PressableScale
            onPress={() => onShowSlots(false)}
            label="Choose another date"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: Spacing.xxs,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
            <Ion name="chevronBack" size={15} color={Brand.accent} />
            <span style={{ ...Typography.label, color: Brand.accent }}>{selectedLabel}</span>
          </PressableScale>

          <span
            style={{ ...Typography.caption, color: free === 0 ? Brand.danger : Brand.success }}>
            {loading
              ? 'Loading…'
              : error
                ? 'Unavailable'
                : free > 0
                  ? `${free} free`
                  : 'No available slots'}
          </span>
        </div>

        {slotOptions.length > 1 ? (
          <div
            className="mobile-scroll"
            style={{
              display: 'flex',
              gap: Spacing.xs,
              overflowX: 'auto',
              paddingBottom: Spacing.sm,
            }}>
            {slotOptions.map((option) => (
              <Chip
                key={option.durationMinutes}
                label={`${durationLabel(option.durationMinutes)} · ${price(option.price)}`}
                size="sm"
                variant="outline"
                selected={slotMinutes === option.durationMinutes}
                onPress={() => onChangeSlotLength(option.durationMinutes)}
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <Centre>
            <span style={{ ...Typography.caption, color: Brand.danger, textAlign: 'center' }}>
              {error}
            </span>
          </Centre>
        ) : loading && slots.length === 0 ? (
          <Centre>
            <Spinner />
          </Centre>
        ) : slots.length === 0 ? (
          <Centre>
            <span style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'center' }}>
              This court isn’t open on {selectedLabel}.
            </span>
          </Centre>
        ) : (
          <div
            className="mobile-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingBottom: Spacing.sm,
              opacity: loading ? 0.4 : 1,
            }}>
            <SlotGrid value={slotKey} onChange={onChangeSlot} slots={slots} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={frame}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: Spacing.sm,
        }}>
        <MonthNav
          direction="back"
          disabled={!canGoBack}
          label="Previous month"
          onPress={() => step(-1)}
        />
        <span style={{ ...Typography.label, color: Brand.text }}>
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </span>
        <MonthNav
          direction="forward"
          disabled={!canGoForward}
          label="Next month"
          onPress={() => step(1)}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          paddingBottom: Spacing.xs,
        }}>
        {WEEKDAYS.map((day, index) => (
          <span
            key={`${day}-${index}`}
            style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'center' }}>
            {day}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}>
        {cells.map((day, index) => {
          if (!day) return <span key={`pad-${index}`} />;

          const key = dateKeyOf(day);
          const isToday = key === dateKeyOf(today);
          const isSelected = key === date;
          const outOfRange = day < today || day > last;

          return (
            <button
              key={key}
              type="button"
              disabled={outOfRange}
              aria-current={isSelected ? 'date' : undefined}
              aria-label={day.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              onClick={() => {
                onChangeDate(key);
                onShowSlots(true);
              }}
              className="mobile-press"
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: outOfRange ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: Radius.pill,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...Typography.caption,
                  color: isSelected
                    ? Brand.onAccent
                    : outOfRange
                      ? Brand.textMuted
                      : isToday
                        ? Brand.accent
                        : Brand.text,
                  fontWeight: isSelected || isToday ? 700 : 500,
                  opacity: outOfRange ? 0.45 : 1,
                  border: isToday && !isSelected ? `1px solid ${Brand.accent}` : 'none',
                  backgroundColor: isSelected ? Brand.accent : 'transparent',
                }}>
                {day.getDate()}
              </span>
              {isToday ? (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    width: 3,
                    height: 3,
                    borderRadius: Radius.pill,
                    backgroundColor: isSelected ? Brand.onAccent : Brand.accent,
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <span
        style={{
          ...Typography.caption,
          color: Brand.textMuted,
          textAlign: 'center',
          marginTop: 'auto',
        }}>
        Bookable up to {daysAhead} {daysAhead === 1 ? 'day' : 'days'} ahead
      </span>
    </div>
  );
}

function Centre({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: Spacing.md,
        paddingRight: Spacing.md,
      }}>
      {children}
    </div>
  );
}

function MonthNav({
  direction,
  disabled,
  label,
  onPress,
}: {
  direction: 'back' | 'forward';
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onPress}
      className="mobile-press"
      style={{
        width: 28,
        height: 28,
        borderRadius: Radius.pill,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        backgroundColor: Brand.backgroundElement,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}>
      <Ion
        name={direction === 'back' ? 'chevronBack' : 'chevronForward'}
        size={16}
        color={disabled ? Brand.textMuted : Brand.text}
      />
    </button>
  );
}
