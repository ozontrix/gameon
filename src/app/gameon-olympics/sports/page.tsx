import OlympicsSportsPage from '@/components/olympics/sports-page';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Olympics Sports — Categories & Fees', description: 'Explore badminton, pickleball, box cricket and football categories and entry fees at GameOn Olympics in Sector 70, Gurugram.', path: '/gameon-olympics/sports' });

export default function SportsPage() {
  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'GameOn Olympics', path: '/gameon-olympics' }, { name: 'Sports', path: '/gameon-olympics/sports' }]} /><OlympicsSportsPage /></>;
}