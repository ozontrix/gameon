import { pageMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { LeagueLanding } from "@/components/league/landing";
import { LeagueBookingsComingSoon } from "@/components/league/bookings-coming-soon";

// Set to false to restore the original league page exactly as it was.
const SHOW_BOOKINGS_COMING_SOON = false;

export const metadata = pageMetadata({
  title: 'Multisports League — Sports, Dates & Fees', path: '/gameon-multisports-league',
  description:
    "4 sports · 20 categories · ₹3 lakh+ overall prize pool. Pickleball Showdown: 31 October & 1 November 2026, with 11 singles and doubles categories. Badminton, box cricket 7v7 and football 6v6: 24 & 25 October 2026.",
});

export default function MultisportsLeagueHome() {
  if (SHOW_BOOKINGS_COMING_SOON) return <LeagueBookingsComingSoon />;

  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Multisports League', path: '/gameon-multisports-league' }]} /><LeagueLanding /></>;
}
