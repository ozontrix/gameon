import type { MetadataRoute } from 'next';
import { SITE_URL, absoluteUrl, isPreviewDeployment } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isPreviewDeployment ? { userAgent: '*', disallow: '/' } : { userAgent: '*', allow: '/', disallow: ['/api/', '/swagger.json', '/sw.js'] },
    sitemap: absoluteUrl('/sitemap.xml'), host: SITE_URL,
  };
}