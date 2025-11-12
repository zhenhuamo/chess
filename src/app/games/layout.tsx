import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chess Analysis Library | Free Chess Game Analysis with Stockfish",
  description: "Master chess analysis with our free chess analysis library. Browse 100,000+ games for free chess analysis with Stockfish 17 engine. Premium chess engine analysis features.",
  keywords: [
    "chess analysis",
    "free chess analysis",
    "chess analysis free",
    "analysis chess",
    "chess game analysis",
  ],
  openGraph: {
    title: "Chess Analysis | Free Chess Game Analysis with Stockfish",
    description: "Free chess analysis tools with 100,000+ master games. Get instant Stockfish 17 chess engine analysis on our chess analysis board.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chess Analysis | Free Chess Game Analysis",
    description: "Free chess analysis with Stockfish 17. Browse 100,000+ games for analysis chess board features.",
  },
  alternates: {
    canonical: "https://chess-analysis.org/games",
  },
};

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
