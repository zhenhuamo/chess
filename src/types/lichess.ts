export interface LichessErrorBody {
  error: string | LichessError;
}

export interface LichessEvalBody {
  depth: number;
  pvs: {
    moves: string;
    cp?: number;
    mate?: number;
  }[];
}

export type LichessResponse<T> = T | LichessErrorBody;

export enum LichessError {
  NotFound = "No cloud evaluation available for that position",
}

interface LichessPlayer {
  user?: {
    name: string;
    title?: string;
  };
  name?: string; // For masters DB, name is often top-level or handled differently
  rating: number;
}

interface LichessClock {
  initial: number;
  increment: number;
  totalTime: number;
}

export interface LichessGame {
  id: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
  winner?: "white" | "black";
  perf?: string;
  rated?: boolean;
  moves: string;
  pgn: string;
  clock: LichessClock;
  opening?: {
    eco?: string;
    name?: string;
  };
  url?: string;
}

export interface LichessExplorerMove {
  uci: string;
  san: string;
  averageRating?: number;
  white: number;
  draws: number;
  black: number;
  game?: LichessGame; // For top games in masters
}

export interface LichessExplorerGame {
  id: string;
  winner: "white" | "black" | "draw";
  white: LichessPlayer;
  black: LichessPlayer;
  year: number;
  month: string;
}

export interface LichessExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessExplorerMove[];
  topGames?: LichessExplorerGame[];
  recentGames?: LichessExplorerGame[];
  opening?: {
    eco: string;
    name: string;
  };
}

export interface LichessPuzzle {
  game: {
    id: string;
    perf: { key: string; name: string };
    rated: boolean;
    players: [
      { userId: string; name: string; color: "white" | "black" },
      { userId: string; name: string; color: "white" | "black" }
    ];
    pgn: string;
    clock: string;
  };
  puzzle: {
    id: string;
    rating: number;
    plays: number;
    initialPly: number;
    solution: string[];
    themes: string[];
  };
}

export interface LichessTVChannel {
  user: {
    name: string;
    title?: string;
    id: string;
  };
  rating: number;
  gameId: string;
}

export interface LichessTVResponse {
  [key: string]: LichessTVChannel;
}
