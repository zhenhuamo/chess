import type { Metadata } from 'next';

const title = 'Position Explorer — Free Chess Analysis Board';
const description = 'Free data‑driven chess analysis: top moves, win rates, mini opening tree, model games, and a one‑click practice queue.';
const keywords = [
  'chess analysis','lichess analysis','chess analysis free','chess analysis board','free chess analysis','lichess analysis board','chess.com analysis','chess game analysis','chess board analysis','chess engine analysis','chess com analysis','free analysis chess','chess free analysis','analysis chess'
];

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: '/explore' },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    type: 'website',
    url: '/explore',
    images: [{ url: '/og/explore.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og/explore.png'],
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}

