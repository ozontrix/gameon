import OlympicsHomePage from '@/components/olympics/home-page';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'GameOn Olympics — Sports & Registration', description: 'Explore GameOn Olympics in Sector 70, Gurugram. Discover badminton, pickleball, box cricket and football categories, entry fees and registration.', path: '/gameon-olympics' });

export default function OlympicsPage() {
  return <><Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'GameOn Olympics', path: '/gameon-olympics' }]} /><OlympicsHomePage /></>;
}