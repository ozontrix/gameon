import { NextResponse } from 'next/server';
import { SportsCatalogService } from '@/lib/services/sports-catalog.service';

/**
 * Public, unauthenticated: one catalog card by its id — the `court_types` row
 * the sport detail screen's `/sport/[id]` route param points at.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Postgres rejects a malformed uuid outright, so answer it as a miss.
    const card = UUID.test(id) ? await SportsCatalogService.getCard(id) : null;

    if (!card) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('Get Sports Catalog Card Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
