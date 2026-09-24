import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ─── Tournaments ────────────────────────────────────────────────────────── */

export async function listTournaments(filters: { venue?: string; status?: string }) {
  let query = supabaseAdmin
    .from('tournaments')
    .select(
      `id, title, match_type, team_capacity, entry_fee, starts_on, ends_on, status,
       venues ( name ), court_types ( name ),
       tournament_registrations ( status )`
    )
    .order('starts_on', { ascending: false });
  if (filters.venue && UUID.test(filters.venue)) query = query.eq('venue_id', filters.venue);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;

  return data.map(({ tournament_registrations: registrations, ...tournament }) => ({
    ...tournament,
    teamsIn: registrations.filter((r) => r.status === 'PENDING' || r.status === 'CONFIRMED').length,
  }));
}

export async function getTournament(id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select(
      `id, venue_id, court_type_id, title, match_type, description, format, team_size_label,
       team_capacity, entry_fee, starts_on, ends_on, daily_start_time, daily_end_time,
       registration_closes_at, status`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [images, sections, registrations] = await Promise.all([
    supabaseAdmin.from('tournament_images').select('id, url, sort_order').eq('tournament_id', id).order('sort_order').order('created_at'),
    supabaseAdmin.from('tournament_sections').select('id, title, body, sort_order').eq('tournament_id', id).order('sort_order'),
    supabaseAdmin
      .from('tournament_registrations')
      .select('id, team_name, captain_name, contact_phone, contact_email, status, payment_status, amount_paid, created_at')
      .eq('tournament_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    tournament: data,
    images: images.data ?? [],
    sections: sections.data ?? [],
    registrations: registrations.data ?? [],
  };
}

/* ─── Events (occasions) ─────────────────────────────────────────────────── */

export async function listEvents(filters: { venue?: string; status?: string }) {
  let query = supabaseAdmin
    .from('events')
    .select(
      `id, title, category, ticket_capacity, entry_fee, fee_unit, starts_on, ends_on, status,
       venues ( name ), sports ( name ),
       event_orders ( status, tickets )`
    )
    .order('starts_on', { ascending: false });
  if (filters.venue && UUID.test(filters.venue)) query = query.eq('venue_id', filters.venue);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;

  return data.map(({ event_orders: orders, ...event }) => ({
    ...event,
    ticketsSold: orders
      .filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED')
      .reduce((total, o) => total + o.tickets, 0),
  }));
}

export async function getEvent(id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(
      `id, venue_id, sport_id, title, category, description, format, starts_on, ends_on,
       daily_start_time, daily_end_time, registration_closes_at,
       entry_fee, fee_unit, ticket_capacity, max_tickets_per_order, status`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [images, sections, orders] = await Promise.all([
    supabaseAdmin.from('event_images').select('id, url, sort_order').eq('event_id', id).order('sort_order').order('created_at'),
    supabaseAdmin.from('event_sections').select('id, title, body, sort_order').eq('event_id', id).order('sort_order'),
    supabaseAdmin
      .from('event_orders')
      .select('id, attendee_name, contact_phone, contact_email, tickets, status, payment_status, amount_paid, created_at')
      .eq('event_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    event: data,
    images: images.data ?? [],
    sections: sections.data ?? [],
    orders: orders.data ?? [],
  };
}
