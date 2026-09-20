import { NextResponse } from 'next/server';
import { SlotService } from '@/lib/services/slot.service';
import { SportsCatalogService, type SportsCatalogCard } from '@/lib/services/sports-catalog.service';

/**
 * Public, unauthenticated: the cards the app's Sports tab renders. See
 * `SportsCatalogService` for how a card is built. `GET .../catalog/[id]`
 * fetches a single one of these by its `key` — that's the real backend
 * entity a tapped card resolves to, not just a name carried in the route.
 *
 * One field the mock UI showed has no backing data and is deliberately left
 * out rather than faked: a star rating (no reviews table). `date`/`time`,
 * on the other hand, are real — they run each surviving card's facilities
 * through the same `SlotService` the booking flow itself uses, and keep the
 * card only if at least one of its courts is actually free.
 */

/**
 * Whether any of a card's courts has a free slot on `date`, in any of the slot
 * lengths the card sells (optionally narrowed to ones starting in `hour`, e.g. "18").
 */
async function hasAvailability(card: SportsCatalogCard, date: string, hour: string | null): Promise<boolean> {
  for (const facilityId of card.facilityIds) {
    for (const { durationMinutes } of card.slotOptions) {
      const slots = await SlotService.getSlots(facilityId, date, { durationMinutes });
      const candidates = hour ? slots.filter((slot) => slot.start_time.startsWith(`${hour}:`)) : slots;
      if (candidates.some((slot) => slot.available)) return true;
    }
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportParam = searchParams.get('sport');
    const surfaceParam = searchParams.get('surface');
    const settingParam = searchParams.get('setting');
    const climateParam = searchParams.get('climate');
    const sortParam = searchParams.get('sort');
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');

    let cards: SportsCatalogCard[] = await SportsCatalogService.listCards();

    // Filtering and sorting run here rather than in the app: the same rules,
    // applied once, on the same data the cards were built from.
    if (sportParam) cards = cards.filter((card) => card.sport === sportParam);
    if (surfaceParam) cards = cards.filter((card) => card.type.includes(surfaceParam));
    if (settingParam) cards = cards.filter((card) => card.badges.includes(settingParam));
    if (climateParam) cards = cards.filter((card) => card.badges.includes(climateParam));

    // Real availability, checked last so it only runs against whatever
    // already survived the cheaper attribute filters above.
    if (dateParam) {
      const availability = await Promise.all(
        cards.map((card) => hasAvailability(card, dateParam, timeParam)),
      );
      cards = cards.filter((_, index) => availability[index]);
    }

    if (sortParam === 'price-asc') cards = [...cards].sort((a, b) => a.priceFrom - b.priceFrom);
    if (sortParam === 'price-desc') cards = [...cards].sort((a, b) => b.priceFrom - a.priceFrom);

    return NextResponse.json({ success: true, data: cards });
  } catch (error) {
    console.error('Get Sports Catalog Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
