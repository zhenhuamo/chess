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
  user: {
    name: string;
    title?: string;
  };
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
