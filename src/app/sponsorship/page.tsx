import { SponsorshipPage } from "@/components/SponsorshipPage";
import { pageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbData } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Sponsorship', path: '/sponsorship',
  description:
    "Partner with Game On Multi Sports in Sector 70, Gurugram. Sponsorship opportunities, brand visibility, and launch event partnerships across every sport and zone.",
});

export default function Sponsorship() {
  return <><JsonLd data={breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Sponsorship', path: '/sponsorship' }])} /><SponsorshipPage /></>;
}
