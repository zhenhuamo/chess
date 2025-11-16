import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, listBlogSlugs } from '@/src/lib/blog';
import PostClient from '../components/PostClient';
import { SITE_URL } from '@/src/config/site';

// Extract first <video> (or a wrapping <figure> that contains a <video>) from an HTML string.
// Returns { leadHtml, contentHtml }. This runs on the server to keep SSR/CSR consistent.
function extractLeadVideo(html: string): { leadHtml: string | null; contentHtml: string } {
  try {
    // Try to extract a <figure> that contains a <video> first
    const figureWithVideo = html.match(/<figure\b[^>]*>[\s\S]*?<video\b[\s\S]*?<\/video>[\s\S]*?<\/figure>/i);
    if (figureWithVideo) {
      const leadHtml = figureWithVideo[0]
        // ensure crossorigin on any video tags
        .replace(/<video\b(?![^>]*\bcrossorigin=)/gi, '<video crossorigin="anonymous" ');
      const contentHtml = html.replace(figureWithVideo[0], '');
      return { leadHtml, contentHtml };
    }
    // Fallback: extract bare <video>…</video>
    const videoOnly = html.match(/<video\b[\s\S]*?<\/video>/i);
    if (videoOnly) {
      const leadHtml = videoOnly[0].replace(/<video\b(?![^>]*\bcrossorigin=)/gi, '<video crossorigin="anonymous" ');
      const contentHtml = html.replace(videoOnly[0], '');
      return { leadHtml, contentHtml };
    }
  } catch {
    // ignore
  }
  return { leadHtml: null, contentHtml: html };
}

export async function generateStaticParams() {
  const slugs = await listBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const { data } = post;
  const url = `/blog/${slug}`;
  const images = [{ url: data.cover || '/og/explore.png' }];
  // Prefer author-provided canonical; otherwise use absolute URL derived from site config.
  const canonical = data.canonical || `${SITE_URL.replace(/\/$/, '')}${url}`;
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    alternates: { canonical },
    openGraph: { title: data.title, description: data.description, type: 'article', url: canonical, images },
    twitter: { card: 'summary_large_image', title: data.title, description: data.description, images: images.map(i => i.url) },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();
  const { data, html } = post;
  const { leadHtml, contentHtml } = extractLeadVideo(html);
  return (
    <PostClient
      title={data.title || slug}
      description={data.description}
      date={data.date}
      cover={data.cover}
      html={html}
      leadHtml={leadHtml}
      contentHtml={contentHtml}
      siteUrl={SITE_URL}
      keywords={data.keywords}
      tags={data.tags}
    />
  );
}
