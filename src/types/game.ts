import { GameEval } from "./eval";

export interface Game {
  id: number;
  pgn: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white: Player;
  black: Player;
  result?: string;
  eval?: GameEval;
  termination?: string;
  timeControl?: string;
  // Additional metadata for local play vs engine
  playerSide?: 'w'|'b';
  origin?: string; // e.g. 'play'
  engineVariant?: string; // e.g. 'sf17-lite'
}

export interface Player {
  name: string;
  rating?: number;
  avatarUrl?: string;
  title?: string;
}

export interface LoadedGame {
  id: string;
  pgn: string;
  date?: string;
  white: Player;
  black: Player;
  result?: string;
  timeControl?: string;
  movesNb?: number;
  url?: string;
  perfType?: string;
  isRated?: boolean;
  openingName?: string;
  termination?: string;
  ecoCode?: string;
  timestamp?: number;
}
