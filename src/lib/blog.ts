import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { markdownToHtml } from './markdown';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export type BlogFrontmatter = {
  title?: string;
  description?: string;
  keywords?: string[];
  cover?: string;
  date?: string; // YYYY-MM-DD
  tags?: string[];
  // Optional canonical URL for the post (absolute URL preferred).
  // If not provided, we fall back to the post route.
  canonical?: string;
};

export type BlogPost = {
  slug: string;
  data: BlogFrontmatter;
  html: string;
};

export async function listBlogSlugs(): Promise<string[]> {
  const files = await fs.readdir(BLOG_DIR);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    const raw = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(raw);
    const html = await markdownToHtml(content);
    return { slug, data: (data as BlogFrontmatter) || {}, html };
  } catch {
    return null;
  }
}

export async function getAllPostsMeta(): Promise<{ slug: string; data: BlogFrontmatter }[]> {
  const slugs = await listBlogSlugs();
  const list = await Promise.all(
    slugs.map(async (slug) => {
      const p = await getPostBySlug(slug);
      return p ? { slug, data: p.data } : null;
    })
  );
  return (list.filter(Boolean) as { slug: string; data: BlogFrontmatter }[]).sort((a, b) => {
    const ad = a.data.date || '';
    const bd = b.data.date || '';
    return ad < bd ? 1 : ad > bd ? -1 : 0;
  });
}
