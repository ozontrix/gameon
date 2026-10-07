import { OpenPlayLanding } from '@/components/open-play/landing';
import { openPlayIsClosed } from '@/lib/open-play/constants';
import { pageMetadata } from '@/lib/seo';
import './open-play.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({
  title: 'Free Open Play · 18 October 2026', path: '/open-play-registrations',
  description: 'Your Sunday. On us. Play cricket, football, badminton or pickleball for free on 18 October 2026 at GameOn, Sector 70, Gurugram. Join the list, then stay for the evening DJ, pizza and coffee parties.',
  image: '/open-play-registrations/social-preview', imageAlt: 'Your Sunday. On us. Free open play at GameOn on 18 October 2026.',
});
export default function OpenPlayRegistrationsPage() {
  return <OpenPlayLanding closed={openPlayIsClosed()} />;
}