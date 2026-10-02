import OlympicsEventsPage from '@/components/olympics/events-page';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Olympics Events & Schedule', description: 'Discover the GameOn Olympics event line-up, sports brackets and December 2026 schedule in Sector 70, Gurugram.', path: '/gameon-olympics/events' });

export default function EventsPage() {
  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'GameOn Olympics', path: '/gameon-olympics' }, { name: 'Events', path: '/gameon-olympics/events' }]} /><OlympicsEventsPage /></>;
}