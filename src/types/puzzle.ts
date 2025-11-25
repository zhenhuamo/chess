export type DailyPuzzle = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  popularity: number;
  plays: number;
  themes: string[];
  gameUrl: string | null;
  openingTags: string[];
};
