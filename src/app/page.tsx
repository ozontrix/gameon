import HomePage from '@/components/HomePage';
import { JsonLd } from '@/components/seo/json-ld';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Sports Complex in Sector 70, Gurugram', description: SITE_DESCRIPTION, path: '/' });

export default function Home() {
  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': absoluteUrl('/#website'), name: SITE_NAME, alternateName: 'GameOn', url: absoluteUrl('/'), inLanguage: 'en-IN', publisher: { '@id': absoluteUrl('/#venue') } },
      { '@type': 'SportsActivityLocation', '@id': absoluteUrl('/#venue'), name: SITE_NAME, url: absoluteUrl('/'), description: SITE_DESCRIPTION, image: absoluteUrl('/hero_background.png'), logo: absoluteUrl('/game_on.png'), telephone: '+91 90348 44654', email: 'info@gameonmultisports.com',
        address: { '@type': 'PostalAddress', streetAddress: 'Sports Cube Campus, Sector 70', addressLocality: 'Gurugram', addressRegion: 'Haryana', postalCode: '122101', addressCountry: 'IN' },
        geo: { '@type': 'GeoCoordinates', latitude: 28.394516, longitude: 77.0126389 },
        openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '06:00', closes: '23:00' }],
        sameAs: ['https://www.instagram.com/gameonmultisports'],
      },
    ] }} />
    <HomePage />
  </>;
}