import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/src/config/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE_URL.replace(/\/$/, '');
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/analyze`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/play`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
