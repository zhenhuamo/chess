import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Daily Chess Puzzle - Train Tactics | Chess Analyzer',
    description:
        'Improve your chess tactics with our daily puzzles. Solve challenging positions, view solutions, and analyze games. No login required.',
    alternates: {
        canonical: '/daily-puzzle',
    },
};

export default function DailyPuzzleLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
