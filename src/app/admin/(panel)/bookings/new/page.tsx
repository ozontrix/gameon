import type { Metadata } from 'next';

import { Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, buttonClass, inputClass } from '@/components/admin/ui';
import { formatDate, formatMoney, todayIn } from '@/lib/admin/format';
import { requireStaff } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { SlotService } from '@/lib/services/slot.service';
import { NewBookingForm } from './new-booking-form';

export const metadata: Metadata = { title: 'New booking' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string; date?: string; start?: string; duration?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;

  const { data: courts } = await supabaseAdmin
    .from('facilities')
    .select('id, name, venues!inner ( id, name, is_active, timezone ), court_types!inner ( sports ( name ), court_type_slot_options ( duration_minutes, price, is_active ) )')
    .eq('is_active', true)
    .order('name');

  const activeCourts = (courts ?? []).filter((court) => court.venues.is_active !== false);
  const facilityId = params.facility && UUID.test(params.facility) ? params.facility : undefined;
  const court = activeCourts.find((entry) => entry.id === facilityId);
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayIn(court?.venues.timezone ?? undefined);

  // Courts grouped by venue for the picker.
  const byVenue = new Map<string, { name: string; courts: typeof activeCourts }>();
  for (const entry of activeCourts) {
    const group = byVenue.get(entry.venues.id) ?? { name: entry.venues.name, courts: [] };
    group.courts.push(entry);
    byVenue.set(entry.venues.id, group);
  }

  // The slot lengths this court's type sells; the chosen one lays out the day and sets the price.
  const lengths = (court?.court_types.court_type_slot_options ?? [])
    .filter((option) => option.is_active)
    .sort((a, b) => a.duration_minutes - b.duration_minutes);
  const option = lengths.find((entry) => String(entry.duration_minutes) === params.duration) ?? lengths[0];
  const price = Number(option?.price ?? 0);

  const slots =
    court && option
      ? await SlotService.getSlots(court.id, date, { durationMinutes: option.duration_minutes, allowStarted: true })
      : [];

  return (
    <>
      <PageHeader
        back={{ href: '/admin/bookings', label: 'All bookings' }}
        title="New booking"
        description="Book a slot for a walk-in or phone customer. Front-desk bookings are confirmed immediately."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="1. Court & date" />
          <CardBody>
            <form method="get" className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="facility" className="block text-sm font-medium text-zinc-800">
                  Court
                </label>
                <select id="facility" name="facility" defaultValue={court?.id ?? ''} className={inputClass} required>
                  <option value="" disabled>
                    Choose a court
                  </option>
                  {[...byVenue.entries()].map(([venueId, group]) => (
                    <optgroup key={venueId} label={group.name}>
                      {group.courts.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                          {entry.court_types?.sports?.name ? ` · ${entry.court_types.sports.name}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="date" className="block text-sm font-medium text-zinc-800">
                  Date
                </label>
                <input id="date" name="date" type="date" defaultValue={date} className={inputClass} required />
              </div>
              {lengths.length > 1 ? (
                <div className="space-y-1.5">
                  <label htmlFor="duration" className="block text-sm font-medium text-zinc-800">
                    Slot length
                  </label>
                  <select id="duration" name="duration" defaultValue={option?.duration_minutes} className={inputClass}>
                    {lengths.map((entry) => (
                      <option key={entry.duration_minutes} value={entry.duration_minutes}>
                        {entry.duration_minutes} min · {formatMoney(entry.price)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button type="submit" className={buttonClass('secondary', 'md', 'w-full')}>
                Show slots
              </button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="2. Slot, customer & payment"
            description={
              court && option
                ? `${court.name} · ${formatDate(date)} · ${option.duration_minutes} min for ${formatMoney(price)}`
                : undefined
            }
          />
          {!court ? (
            <EmptyState title="Choose a court and date" description="Available slots appear here." />
          ) : !option ? (
            <CardBody>
              <Notice tone="warning">This court&apos;s type has no slot lengths on sale. Add one under Court types &amp; pricing.</Notice>
            </CardBody>
          ) : slots.length === 0 ? (
            <CardBody>
              <Notice tone="warning">This court is not open on {formatDate(date)} (closed day or holiday).</Notice>
            </CardBody>
          ) : !slots.some((slot) => slot.available) ? (
            <CardBody>
              <Notice tone="warning">Every slot on {formatDate(date)} is booked, closed or already over.</Notice>
            </CardBody>
          ) : (
            <NewBookingForm
              facilityId={court.id}
              date={date}
              initialSlot={params.start}
              slots={slots.map((slot) => ({ ...slot, price }))}
            />
          )}
        </Card>
      </div>
    </>
  );
}
