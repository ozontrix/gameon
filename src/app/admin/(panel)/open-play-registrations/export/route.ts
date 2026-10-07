import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin/session';
import { listOpenPlayRegistrations, readOpenPlayFilters } from '@/lib/admin/queries/open-play';

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export async function GET(request: Request) {
  const actor = await getStaffSession();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (actor.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const filters = readOpenPlayFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows: unknown[][] = [['Registration ID', 'Event date', 'Name', 'Phone', 'Email', 'City', 'Sport', 'Event contact consent', 'Marketing consent', 'UTM source', 'UTM medium', 'UTM campaign', 'UTM content', 'UTM term', 'Registered at']];
  for (let page = 1; ; page++) {
    const { registrations } = await listOpenPlayRegistrations(filters, page, 500);
    for (const entry of registrations) {
      const campaign = entry.attribution && typeof entry.attribution === 'object' && !Array.isArray(entry.attribution) ? entry.attribution : {};
      rows.push([entry.id, entry.event_date, entry.full_name, entry.phone, entry.email, entry.city, entry.sport, entry.contact_consent, entry.marketing_consent,
        campaign.utm_source, campaign.utm_medium, campaign.utm_campaign, campaign.utm_content, campaign.utm_term, entry.created_at]);
    }
    if (registrations.length < 500) break;
  }
  return new NextResponse(`\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`, { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="gameon-open-play-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store',
  } });
}