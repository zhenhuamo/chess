"use client";
import { createContext, useContext, useMemo, useState, PropsWithChildren } from "react";

export type EngineVariant = 'sf17'|'sf17-lite'|'sf17-single'|'sf161'|'sf161-lite'|'sf161-single'|'sf16-nnue'|'sf16-nnue-single'|'sf11';

type PlayerColor = 'w'|'b';

export interface PlayConfig {
  variant: EngineVariant;
  threads: number;
  elo: number;
  youPlay: PlayerColor;
  starting?: string; // FEN or PGN
}

interface PlayState {
  isGameInProgress: boolean;
  config: PlayConfig;
  setConfig: (c: Partial<PlayConfig>) => void;
  startGame: (c?: Partial<PlayConfig>) => void;
  endGame: () => void;
  lastPgn?: string;
  setLastPgn: (pgn?: string) => void;
}

const defaultConfig: PlayConfig = { variant: 'sf17-lite', threads: 2, elo: 1350, youPlay: 'w', starting: undefined };

const Ctx = createContext<PlayState | null>(null);

export function PlayProvider({ children }: PropsWithChildren) {
  const [isGameInProgress, setInProgress] = useState(false);
  const [config, setConfigState] = useState<PlayConfig>(() => {
    try {
      const raw = localStorage.getItem('play-config');
      if (raw) return JSON.parse(raw) as PlayConfig;
    } catch {}
    return defaultConfig;
  });

  const setConfig = (patch: Partial<PlayConfig>) => {
    setConfigState(prev => {
      const next = { ...prev, ...patch } as PlayConfig;
      try { localStorage.setItem('play-config', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [lastPgn, setLastPgnState] = useState<string | undefined>(undefined);

  const startGame = (c?: Partial<PlayConfig>) => {
    if (c) setConfig(c);
    setInProgress(true);
  };
  const endGame = () => setInProgress(false);
  const setLastPgn = (pgn?: string) => setLastPgnState(pgn);

  const value = useMemo<PlayState>(() => ({ isGameInProgress, config, setConfig, startGame, endGame, lastPgn, setLastPgn }), [isGameInProgress, config, lastPgn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayState(): PlayState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlayState must be used within PlayProvider');
  return ctx;
}
