import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import type { D1Database } from '@cloudflare/workers-types';
import type { DailyPuzzle } from '@/types/puzzle';

export const runtime = 'edge';

type PuzzleRow = {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  rating_deviation: number;
  popularity: number;
  nb_plays: number;
  themes: string | null;
  game_url: string | null;
  opening_tags: string | null;
};

const EXCLUDE_LIMIT = 200;

const toDailyPuzzle = (row: PuzzleRow): DailyPuzzle => ({
  id: row.id,
  fen: row.fen,
  moves: row.moves.split(' ').filter(Boolean),
  rating: row.rating,
  ratingDeviation: row.rating_deviation,
  popularity: row.popularity,
  plays: row.nb_plays,
  themes: row.themes ? row.themes.split(' ').filter(Boolean) : [],
  gameUrl: row.game_url,
  openingTags: row.opening_tags ? row.opening_tags.split(' ').filter(Boolean) : [],
});

const getDatabase = (): D1Database => {
  const ctx = getRequestContext();
  const db = ctx.env?.PUZZLE_DB as D1Database | undefined;
  if (!db) {
    throw new Error('PUZZLE_DB binding is not available');
  }
  return db;
};

const parseExcludeList = (value: string | null) =>
  value
    ? value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
    : [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeIds = parseExcludeList(searchParams.get('exclude'));
    const limitedExclude = excludeIds.slice(-EXCLUDE_LIMIT);

    const db = getDatabase();

    const query =
      limitedExclude.length > 0
        ? `SELECT * FROM puzzles WHERE id NOT IN (${limitedExclude.map(() => '?').join(', ')}) ORDER BY RANDOM() LIMIT 1`
        : 'SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1';

    const statement = db.prepare(query);
    const result =
      limitedExclude.length > 0
        ? await statement.bind(...limitedExclude).first<PuzzleRow>()
        : await statement.first<PuzzleRow>();

    if (!result) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    return NextResponse.json(toDailyPuzzle(result));
  } catch (error) {
    console.error('[puzzles-api]', error);
    return NextResponse.json({ error: 'Failed to fetch puzzle, please try again later.' }, { status: 500 });
  }
}
