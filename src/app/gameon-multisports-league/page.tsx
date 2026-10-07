import { pageMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { LeagueLanding } from "@/components/league/landing";
import { LeagueBookingsComingSoon } from "@/components/league/bookings-coming-soon";

// Set to false to restore the original league page exactly as it was.
const SHOW_BOOKINGS_COMING_SOON = false;

export const metadata = pageMetadata({
  title: 'Multisports League — Sports, Dates & Fees', path: '/gameon-multisports-league',
  description:
    "24 & 25 October 2026 · 4 sports · 14 categories · ₹3 lakh+ overall prize pool. Badminton singles ₹1,000/person; doubles and mixed doubles ₹2,000/team. Pickleball entry fees ₹1,000–₹2,400 depending on category. Box cricket 7v7 and football 6v6 ₹2,000/team. Check every category's match date before registering.",
});

export default function MultisportsLeagueHome() {
  if (SHOW_BOOKINGS_COMING_SOON) return <LeagueBookingsComingSoon />;

  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Multisports League', path: '/gameon-multisports-league' }]} /><LeagueLanding /></>;
}
