import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Chess Analyzer',
  description: 'Notes, tutorials, and updates about free chess analysis, engine evaluations, and opening exploration.',
  alternates: { canonical: '/blog' },
  robots: { index: true, follow: true },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  // Simple centered layout for blog content (no MUI in server component)
  return (
    <section style={{ padding: '16px 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>{children}</div>
    </section>
  );
}
