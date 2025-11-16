import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/src/config/site';
import { listBlogSlugs, getPostBySlug } from '@/src/lib/blog';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = SITE_URL.replace(/\/$/, '');
  const items: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/analyze`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/games`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${base}/play`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/updates`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];
  // Blog index
  items.push({ url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 });
  // Individual posts from content files
  const slugs = await listBlogSlugs();
  for (const slug of slugs) {
    const p = await getPostBySlug(slug);
    const dt = p?.data?.date ? new Date(p.data.date) : now;
    items.push({
      url: `${base}/blog/${slug}`,
      lastModified: dt,
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }
  return items;
}
