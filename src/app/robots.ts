import type { MetadataRoute } from 'next';
import { SITE_URL, absoluteUrl, isPreviewDeployment } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isPreviewDeployment
      ? { userAgent: '*', disallow: '/' }
      : // `/app` is the mobile web app: a client-rendered shell whose every
        // screen is either an auth form or the signed-in player's own data, so
        // there is nothing there for a crawler to index.
        { userAgent: '*', allow: '/', disallow: ['/api/', '/app/', '/swagger.json', '/sw.js'] },
    sitemap: absoluteUrl('/sitemap.xml'), host: SITE_URL,
  };
}