export const STREAM_ALLOW_LIST: Record<string, string> = {
  'lichess-4000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn',
  'lichess-2025-08-2000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn',
  'lichess-2000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn',
};

export type StreamFileKey = keyof typeof STREAM_ALLOW_LIST;
