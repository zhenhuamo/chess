import { DEFAULT_ENGINE } from "@/src/constants";
import { getRecommendedWorkersNb } from "@/src/lib/engine/worker";
import { EngineName } from "@/src/types/enums";
import { CurrentPosition, GameEval, SavedEvals } from "@/src/types/eval";
import { Chess } from "chess.js";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Game } from "@/src/types/game";

export const gameEvalAtom = atom<GameEval | undefined>(undefined);
export const gameAtom = atom(new Chess());
export const boardAtom = atom(new Chess());
export const currentPositionAtom = atom<CurrentPosition>({});

export const boardOrientationAtom = atom(true);
export const showBestMoveArrowAtom = atom(true);
export const showPlayerMoveIconAtom = atom(true);

export const engineNameAtom = atom<EngineName>(DEFAULT_ENGINE);
export const engineDepthAtom = atom(14);
export const engineMultiPvAtom = atom(3);
// Avoid SSR crashes: navigator is undefined on the server. Use a conservative default in that case.
const DEFAULT_WORKERS_NB = typeof navigator !== "undefined" ? getRecommendedWorkersNb() : 2;
export const engineWorkersNbAtom = atomWithStorage("engineWorkersNb", DEFAULT_WORKERS_NB);
export const evaluationProgressAtom = atom(0);

export const savedEvalsAtom = atom<SavedEvals>({});

// Optional metadata about the loaded game (e.g., player side when game comes from local play)
export const gameMetaAtom = atom<Pick<Game, 'playerSide' | 'origin' | 'engineVariant'> | undefined>(undefined);

// Training / Retry mode state and settings
export type RetryState = {
  active: boolean;
  targetPly?: number; // move index before which we retry (0-based)
  baseFen?: string;   // fen of the position to retry from
  allowedUci?: string[]; // allowed first moves in UCI
  attemptsLeft?: number;
  maxAttempts?: number;
  hintStage?: number; // 0,1,2 ...
  message?: string;
  success?: boolean;
};

export const retryStateAtom = atom<RetryState>({ active: false });
export const retryMaxAttemptsAtom = atomWithStorage('retryMaxAttempts', 3);
export const retryCandidateCpThresholdAtom = atomWithStorage('retryCandidateThresholdCp', 40); // centipawns
export const retryCandidateMaxCountAtom = atomWithStorage('retryCandidateMax', 2);
export const retryIncludeInaccuracyAtom = atomWithStorage('retryIncludeInaccuracy', false);
