import { Icon } from "@iconify/react";
import {
  engineDepthAtom,
  engineMultiPvAtom,
  engineNameAtom,
  engineWorkersNbAtom,
  evaluationProgressAtom,
  gameAtom,
  gameEvalAtom,
  savedEvalsAtom,
} from "@/src/sections/analysis/states";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { getEvaluateGameParams } from "@/src/lib/chess";
import { useGameDatabase } from "@/src/hooks/useGameDatabase";
import { Button } from "@mui/material";
import { useEngine } from "@/src/hooks/useEngine";
import { logAnalyticsEvent } from "@/src/lib/firebase";
import { SavedEvals } from "@/src/types/eval";
import { useEffect, useCallback } from "react";
import { usePlayersData } from "@/src/hooks/usePlayersData";
import { Typography } from "@mui/material";
import { useCurrentPosition } from "@/src/sections/analysis/hooks/useCurrentPosition";
import { useSearchParams } from "next/navigation";

export default function AnalyzeButton() {
  const engineName = useAtomValue(engineNameAtom);
  const engine = useEngine(engineName);
  useCurrentPosition(engine);
  const engineWorkersNb = useAtomValue(engineWorkersNbAtom);
  const [evaluationProgress, setEvaluationProgress] = useAtom(evaluationProgressAtom);
  const engineDepth = useAtomValue(engineDepthAtom);
  const engineMultiPv = useAtomValue(engineMultiPvAtom);
  const { setGameEval } = useGameDatabase();
  const searchParams = useSearchParams();
  const parsedGameId = (() => { try { const id = Number(searchParams?.get('gameId')); return Number.isFinite(id) ? id : NaN; } catch { return NaN; } })();
  const [gameEval, setEval] = useAtom(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const setSavedEvals = useSetAtom(savedEvalsAtom);
  const { white, black } = usePlayersData(gameAtom);

  const readyToAnalyse = engine?.getIsReady() && game.history().length > 0 && !evaluationProgress;

  const handleAnalyze = useCallback(async () => {
    const params = getEvaluateGameParams(game);
    if (!engine?.getIsReady() || params.fens.length === 0 || evaluationProgress) return;

    const newGameEval = await engine.evaluateGame({
      ...params,
      depth: engineDepth,
      multiPv: engineMultiPv,
      setEvaluationProgress,
      playersRatings: { white: white?.rating, black: black?.rating },
      workersNb: engineWorkersNb,
    });

    setEval(newGameEval);
    setEvaluationProgress(0);

    if (!isNaN(parsedGameId)) {
      setGameEval(parsedGameId, newGameEval);
    }

    const gameSavedEvals: SavedEvals = params.fens.reduce((acc, fen, idx) => {
      acc[fen] = { ...newGameEval.positions[idx], engine: engineName } as any;
      return acc;
    }, {} as SavedEvals);
    setSavedEvals((prev) => ({ ...prev, ...gameSavedEvals }));

    logAnalyticsEvent("analyze_game", {
      engine: engineName,
      depth: engineDepth,
      multiPv: engineMultiPv,
      nbPositions: params.fens.length,
    });
  }, [engine, engineName, engineWorkersNb, game, engineDepth, engineMultiPv, evaluationProgress, setEvaluationProgress, setEval, parsedGameId, setGameEval, setSavedEvals, white?.rating, black?.rating]);

  useEffect(() => { setEvaluationProgress(0); }, [engine, setEvaluationProgress]);

  useEffect(() => { if (!gameEval && readyToAnalyse) { handleAnalyze(); } }, [gameEval, readyToAnalyse, handleAnalyze]);

  if (evaluationProgress) return null;
  return (
    <Button variant="contained" size="small" startIcon={<Icon icon="streamline:magnifying-glass-solid" height={12} />} onClick={handleAnalyze} disabled={!readyToAnalyse}>
      <Typography fontSize="0.9em" fontWeight="500" lineHeight="1.4em">{gameEval ? "Analyze again" : "Analyze"}</Typography>
    </Button>
  );
}
