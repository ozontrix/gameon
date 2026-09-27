import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { inputClass, textareaClass } from '@/components/admin/ui';
import { saveEvent, saveTournament } from '@/lib/admin/actions/events';
import { titleCase } from '@/lib/admin/format';
import { DEFAULT_TIMEZONE, wallClockIn } from '@/lib/utils/date-helpers';

/**
 * "Indoor · Wooden · AC" — the same setting/surface/climate breakdown the
 * Court types page and the app's Sports tab card show, so a tournament's
 * court reads identically wherever it appears.
 */
function courtTypeAttributes(type: { surface_type?: string; is_indoor?: boolean; has_ac?: boolean }): string | null {
  if (type.surface_type === undefined || type.is_indoor === undefined || type.has_ac === undefined) return null;
  return [titleCase(type.surface_type), type.is_indoor ? 'Indoor' : 'Outdoor', type.has_ac ? 'AC' : 'Non-AC'].join(' · ');
}

const STATUSES = [
  { value: 'draft', label: 'Draft — hidden from the app' },
  { value: 'published', label: 'Published — listed and open for entries' },
  { value: 'registration_closed', label: 'Registration closed — still listed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

/** An ISO instant, shown on the venue's clock for a `datetime-local` input. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const wall = wallClockIn(DEFAULT_TIMEZONE, new Date(iso));
  return `${wall.date}T${wall.time.slice(0, 5)}`;
}

/* ─── Tournament ─────────────────────────────────────────────────────────── */

export function TournamentForm({
  tournament,
  courtTypes,
}: {
  tournament?: {
    id: string;
    court_type_id: string;
    title: string;
    match_type: string;
    description: string | null;
    format: string | null;
    team_size_label: string | null;
    team_capacity: number;
    entry_fee: number;
    starts_on: string;
    ends_on: string;
    daily_start_time: string;
    daily_end_time: string;
    registration_closes_at: string;
    status: string;
    /** The chosen court type's own attributes, so the current choice reads the same way the Sports tab's card does. */
    court_type_summary?: string | null;
  };
  courtTypes: {
    id: string;
    name: string;
    venue_id: string;
    is_active: boolean | null;
    surface_type?: string;
    is_indoor?: boolean;
    has_ac?: boolean;
    venues?: { name: string } | null;
  }[];
}) {
  return (
    <ActionForm action={saveTournament} className="space-y-4">
      {tournament ? <input type="hidden" name="id" value={tournament.id} /> : null}
      <FormMessage />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title" required>
            Tournament name
          </Label>
          <input id="title" name="title" defaultValue={tournament?.title} placeholder="GameOn Badminton Open" className={inputClass} />
          <FieldError name="title" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="match_type" required>
            Match type
          </Label>
          <input
            id="match_type"
            name="match_type"
            defaultValue={tournament?.match_type}
            placeholder="Men's Doubles"
            className={inputClass}
          />
          <p className="text-xs text-zinc-500">Your own words — shown on the card and at booking time.</p>
          <FieldError name="match_type" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={tournament?.description ?? ''}
            placeholder="A fast-paced doubles showdown across our premium indoor courts."
            className={textareaClass}
          />
          <FieldError name="description" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="court_type_id" required>
            Court type
          </Label>
          <select id="court_type_id" name="court_type_id" defaultValue={tournament?.court_type_id ?? ''} className={inputClass}>
            <option value="" disabled>
              Choose which court this runs on
            </option>
            {courtTypes.map((type) => {
              const attributes = courtTypeAttributes(type);
              return (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.venues ? ` — ${type.venues.name}` : ''}
                  {attributes ? ` (${attributes})` : ''}
                  {type.is_active === false ? ' (inactive)' : ''}
                </option>
              );
            })}
          </select>
          {tournament?.court_type_summary ? (
            <p className="text-xs text-zinc-500">
              Shown on the app the same way the Sports tab shows it: <span className="font-medium text-zinc-700">{tournament.court_type_summary}</span>.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              The venue follows the court type automatically. Descriptive only — this doesn&apos;t block the court&apos;s normal
              hourly bookings.
            </p>
          )}
          <FieldError name="court_type_id" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="format">Format</Label>
          <input id="format" name="format" defaultValue={tournament?.format ?? ''} placeholder="Doubles · round robin" className={inputClass} />
          <FieldError name="format" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team_size_label">Team size</Label>
          <input
            id="team_size_label"
            name="team_size_label"
            defaultValue={tournament?.team_size_label ?? ''}
            placeholder="2 players"
            className={inputClass}
          />
          <FieldError name="team_size_label" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team_capacity" required>
            Team slots
          </Label>
          <input
            id="team_capacity"
            name="team_capacity"
            type="number"
            min={2}
            max={512}
            step={1}
            defaultValue={tournament?.team_capacity ?? 16}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500">How many teams can enter in total.</p>
          <FieldError name="team_capacity" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entry_fee" required>
            Entry fee (₹ per team)
          </Label>
          <input
            id="entry_fee"
            name="entry_fee"
            type="number"
            min={0}
            step={1}
            defaultValue={tournament?.entry_fee ?? 0}
            className={inputClass}
          />
          <FieldError name="entry_fee" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="starts_on" required>
            Starts on
          </Label>
          <input id="starts_on" name="starts_on" type="date" defaultValue={tournament?.starts_on} className={inputClass} />
          <FieldError name="starts_on" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_on" required>
            Ends on
          </Label>
          <input id="ends_on" name="ends_on" type="date" defaultValue={tournament?.ends_on} className={inputClass} />
          <FieldError name="ends_on" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="daily_start_time" required>
            Daily start time
          </Label>
          <input
            id="daily_start_time"
            name="daily_start_time"
            type="time"
            defaultValue={tournament?.daily_start_time?.slice(0, 5)}
            className={inputClass}
          />
          <FieldError name="daily_start_time" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="daily_end_time" required>
            Daily end time
          </Label>
          <input
            id="daily_end_time"
            name="daily_end_time"
            type="time"
            defaultValue={tournament?.daily_end_time?.slice(0, 5)}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500">The one daily window it plays in — there&apos;s no session picker.</p>
          <FieldError name="daily_end_time" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_closes_at" required>
            Registration closes
          </Label>
          <input
            id="registration_closes_at"
            name="registration_closes_at"
            type="datetime-local"
            defaultValue={toLocalInput(tournament?.registration_closes_at)}
            className={inputClass}
          />
          <FieldError name="registration_closes_at" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status" required>
            Status
          </Label>
          <select id="status" name="status" defaultValue={tournament?.status ?? 'draft'} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError name="status" />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">{tournament ? 'Save tournament' : 'Create tournament'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

/* ─── Event (occasion) ───────────────────────────────────────────────────── */

export function EventForm({
  event,
  venues,
  sports,
}: {
  event?: {
    id: string;
    venue_id: string;
    sport_id: string | null;
    title: string;
    category: string;
    description: string | null;
    format: string | null;
    starts_on: string;
    ends_on: string;
    daily_start_time: string;
    daily_end_time: string;
    registration_closes_at: string;
    entry_fee: number | null;
    fee_unit: string;
    ticket_capacity: number;
    max_tickets_per_order: number;
    status: string;
  };
  venues: { id: string; name: string }[];
  sports: { id: string; name: string; is_active: boolean | null }[];
}) {
  return (
    <ActionForm action={saveEvent} className="space-y-4">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <FormMessage />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title" required>
            Event name
          </Label>
          <input id="title" name="title" defaultValue={event?.title} placeholder="GameOn Monsoon Carnival" className={inputClass} />
          <FieldError name="title" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category" required>
            Category
          </Label>
          <input id="category" name="category" defaultValue={event?.category} placeholder="Family Sports Day" className={inputClass} />
          <FieldError name="category" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={event?.description ?? ''}
            placeholder="A day out for the whole family: taster sessions, games and food stalls."
            className={textareaClass}
          />
          <FieldError name="description" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="venue_id" required>
            Venue
          </Label>
          <select id="venue_id" name="venue_id" defaultValue={event?.venue_id ?? ''} className={inputClass}>
            <option value="" disabled>
              Choose a venue
            </option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          <FieldError name="venue_id" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sport_id">Sport (optional)</Label>
          <select id="sport_id" name="sport_id" defaultValue={event?.sport_id ?? ''} className={inputClass}>
            <option value="">Not sport-specific</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
                {sport.is_active === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">Only if the occasion is themed around one sport.</p>
          <FieldError name="sport_id" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="format">Format</Label>
          <input
            id="format"
            name="format"
            defaultValue={event?.format ?? ''}
            placeholder="Drop-in · come and go all day"
            className={inputClass}
          />
          <FieldError name="format" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket_capacity" required>
            Ticket capacity
          </Label>
          <input
            id="ticket_capacity"
            name="ticket_capacity"
            type="number"
            min={1}
            max={100000}
            step={1}
            defaultValue={event?.ticket_capacity ?? 100}
            className={inputClass}
          />
          <FieldError name="ticket_capacity" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entry_fee">Entry fee (₹ per ticket)</Label>
          <input
            id="entry_fee"
            name="entry_fee"
            type="number"
            min={0}
            step={1}
            defaultValue={event?.entry_fee ?? ''}
            placeholder="Leave blank if free"
            className={inputClass}
          />
          <FieldError name="entry_fee" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fee_unit">Fee unit</Label>
          <input id="fee_unit" name="fee_unit" defaultValue={event?.fee_unit ?? 'per person'} className={inputClass} />
          <FieldError name="fee_unit" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max_tickets_per_order">Max tickets per order</Label>
          <input
            id="max_tickets_per_order"
            name="max_tickets_per_order"
            type="number"
            min={1}
            max={50}
            step={1}
            defaultValue={event?.max_tickets_per_order ?? 10}
            className={inputClass}
          />
          <FieldError name="max_tickets_per_order" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="starts_on" required>
            Starts on
          </Label>
          <input id="starts_on" name="starts_on" type="date" defaultValue={event?.starts_on} className={inputClass} />
          <FieldError name="starts_on" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_on" required>
            Ends on
          </Label>
          <input id="ends_on" name="ends_on" type="date" defaultValue={event?.ends_on} className={inputClass} />
          <FieldError name="ends_on" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="daily_start_time" required>
            Daily start time
          </Label>
          <input
            id="daily_start_time"
            name="daily_start_time"
            type="time"
            defaultValue={event?.daily_start_time?.slice(0, 5)}
            className={inputClass}
          />
          <FieldError name="daily_start_time" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="daily_end_time" required>
            Daily end time
          </Label>
          <input
            id="daily_end_time"
            name="daily_end_time"
            type="time"
            defaultValue={event?.daily_end_time?.slice(0, 5)}
            className={inputClass}
          />
          <FieldError name="daily_end_time" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_closes_at" required>
            Ticket sales close
          </Label>
          <input
            id="registration_closes_at"
            name="registration_closes_at"
            type="datetime-local"
            defaultValue={toLocalInput(event?.registration_closes_at)}
            className={inputClass}
          />
          <FieldError name="registration_closes_at" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status" required>
            Status
          </Label>
          <select id="status" name="status" defaultValue={event?.status ?? 'draft'} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError name="status" />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">{event ? 'Save event' : 'Create event'}</SubmitButton>
      </div>
    </ActionForm>
  );
}
