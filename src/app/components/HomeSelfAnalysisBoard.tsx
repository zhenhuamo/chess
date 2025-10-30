'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Divider, Paper, Stack, Typography, Switch, FormControlLabel } from '@mui/material';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useStockfish } from '../hooks/useStockfish';
import { playMoveSound, playSoundFromMove } from '@/src/lib/sounds';
import { useResponsiveBoardSize } from '@/src/hooks/useResponsiveBoardSize';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useStockfishPool } from '../hooks/useStockfishPool';
import HomeAnalysisSettingsButton from './HomeAnalysisSettingsButton';
import type { HomeAnalysisSettings } from './HomeAnalysisSettingsDialog';
import type { EngineVariant } from '@/src/types/engine';
import { MoveClassification } from '@/src/types/enums';
import { openings } from '@/src/data/openings';
import { getMovesClassification } from '@/src/lib/engine/helpers/moveClassification';
import { getEvaluateGameParams, moveLineUciToSan } from '@/src/lib/chess';
import type { PositionEval } from '@/src/types/eval';

const copyGame = (src: Chess): Chess => {
  const clone = new Chess();
  try {
    clone.loadPgn(src.pgn());
  } catch {
    clone.load(src.fen());
  }
  return clone;
};

const formatScore = (score?: number, mate?: number) => {
  if (typeof mate === 'number') return `${mate > 0 ? '' : '-'}M${Math.abs(mate)}`;
  if (typeof score === 'number') return (score / 100).toFixed(2);
  return 'N/A';
};

const clampEvalPercent = (score?: number, mate?: number) => {
  if (typeof mate === 'number') return mate > 0 ? 98 : 2;
  if (typeof score === 'number') return Math.max(0, Math.min(100, 50 + score / 10));
  return 50;
};

const CLASSIFICATION_ICON: Partial<Record<MoveClassification, string>> = {
  [MoveClassification.Opening]: '/icons/opening.png',
  [MoveClassification.Forced]: '/icons/forced.png',
  [MoveClassification.Splendid]: '/icons/splendid.png',
  [MoveClassification.Perfect]: '/icons/perfect.png',
  [MoveClassification.Best]: '/icons/best.png',
  [MoveClassification.Excellent]: '/icons/excellent.png',
  [MoveClassification.Okay]: '/icons/okay.png',
  [MoveClassification.Inaccuracy]: '/icons/inaccuracy.png',
  [MoveClassification.Mistake]: '/icons/mistake.png',
  [MoveClassification.Blunder]: '/icons/blunder.png',
};

const DEFAULT_CLASSIFICATION_ICON = '/icons/best.png';

type BestSuggestion = {
  uci: string;
  san: string;
  classification: MoveClassification;
  icon: string;
  openingName?: string;
  bestSan?: string;
  bestUci?: string;
};

const classificationLabel = (cls: MoveClassification): string => {
  switch (cls) {
    case MoveClassification.Splendid: return 'a brilliant move';
    case MoveClassification.Perfect: return 'a great move';
    case MoveClassification.Excellent: return 'a good move';
    case MoveClassification.Best: return 'the best move';
    case MoveClassification.Okay: return 'an okay move';
    case MoveClassification.Inaccuracy: return 'an inaccuracy';
    case MoveClassification.Mistake: return 'a mistake';
    case MoveClassification.Blunder: return 'a blunder';
    case MoveClassification.Forced: return 'a forced move';
    case MoveClassification.Opening: return 'a book move';
    default: return 'the best move';
  }
};

export default function HomeSelfAnalysisBoard() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [engineThinking, setEngineThinking] = useState(false);
  const [lastAnalysisMove, setLastAnalysisMove] = useState<string | null>(null);
  const {
    analyzePreferCloud,
    analysis,
    info,
    lines,
    isReady,
    stop,
    setStrengthElo: configureStrengthElo,
    setThreads: configureThreads,
    setEngineVariant: configureEngineVariant,
    setMultiPv: configureMultiPv,
  } = useStockfish();
  const lastAnalyzedFenRef = useRef(game.fen());
  const requestSeqRef = useRef(0);
  const latestRequestSeq = useRef(0);
  const boardSize = useResponsiveBoardSize();

  const [engineVariant, setEngineVariantPreference] = useLocalStorage<EngineVariant>('home-analysis-engine', 'sf17-lite');
  const [analysisDepth, setAnalysisDepth] = useLocalStorage<number>('home-analysis-depth', 18);
  const [analysisMultiPv, setAnalysisMultiPv] = useLocalStorage<number>('home-analysis-multipv', 3);
  const [analysisThreads, setAnalysisThreads] = useLocalStorage<number>('home-analysis-threads', 2);
  const [analysisElo, setAnalysisElo] = useLocalStorage<number>('home-analysis-elo', 2800);
  const [showHintArrow, setShowHintArrow] = useLocalStorage<boolean>('home-show-hint', true);

  const appliedVariantRef = useRef<EngineVariant | null>(null);
  const appliedThreadsRef = useRef<number | null>(null);
  const appliedMultiPvRef = useRef<number | null>(null);
  const appliedEloRef = useRef<number | null>(null);
  const [bestSuggestion, setBestSuggestion] = useState<BestSuggestion | null>(null);
  const pool = useStockfishPool();

  const evalPercent = useMemo(() => clampEvalPercent(info?.score, info?.mate), [info]);

  const analyzePosition = useCallback(
    (fen: string) => {
      lastAnalyzedFenRef.current = fen;
      const seq = ++requestSeqRef.current;
      latestRequestSeq.current = seq;
      setEngineThinking(true);
      analyzePreferCloud(fen, analysisDepth).catch(() => {
        if (latestRequestSeq.current === seq) {
          setEngineThinking(false);
        }
      });
    },
    [analysisDepth, analyzePreferCloud],
  );

  const restart = () => {
    const fresh = new Chess();
    setGame(fresh);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastAnalysisMove(null);
    setBestSuggestion(null);
    analyzePosition(fresh.fen());
  };

  const undo = () => {
    try {
      const next = copyGame(game);
      next.undo();
      setGame(next);
      setSelectedSquare(null);
      setValidMoves([]);
      setLastAnalysisMove(null);
      setBestSuggestion(null);
      analyzePosition(next.fen());
    } catch {}
  };

  const handleUserMove = useCallback(
    (from: string, to: string) => {
      try {
        const next = copyGame(game);
        const result = next.move({ from: from as Square, to: to as Square, promotion: 'q' });
        if (!result) return false;
        setGame(next);
        setSelectedSquare(null);
        setValidMoves([]);
        setLastAnalysisMove(null);
        setBestSuggestion(null);
        try {
          if (next.isCheck()) playMoveSound();
          else playSoundFromMove(result as any);
        } catch {}
        analyzePosition(next.fen());
        return true;
      } catch {
        return false;
      }
    },
    [analyzePosition, game],
  );

  const onSquareClick = (square: string) => {
    if (engineThinking) return;
    if (selectedSquare) {
      const moves = game.moves({ square: selectedSquare as Square, verbose: true });
      const legal = moves.some((m: any) => m.to === square);
      if (legal) {
        handleUserMove(selectedSquare, square);
        return;
      }
    }
    const nextMoves = game.moves({ square: square as Square, verbose: true });
    if (nextMoves.length) {
      setSelectedSquare(square);
      setValidMoves(nextMoves.map((m: any) => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  useEffect(() => {
    if (analysis?.bestMove) {
      setEngineThinking(false);
      const seq = latestRequestSeq.current;
      if (seq === requestSeqRef.current) {
        setLastAnalysisMove(analysis.bestMove);
      }
    }
  }, [analysis]);

  useEffect(() => {
    if (!engineThinking && info?.depth !== undefined) {
      // allow info updates to continue while engine thinking; no extra handling needed.
    }
  }, [engineThinking, info]);

  useEffect(() => () => { stop(); }, [stop]);

  const normalizedThreads = useMemo(() => Math.max(1, Math.min(32, Math.floor(analysisThreads))), [analysisThreads]);
  const normalizedMultiPv = useMemo(() => Math.max(1, Math.min(6, Math.floor(analysisMultiPv))), [analysisMultiPv]);
  const normalizedElo = useMemo(() => Math.max(1320, Math.min(3190, Math.floor(analysisElo))), [analysisElo]);

  useEffect(() => {
    if (appliedVariantRef.current === engineVariant) return;
    appliedVariantRef.current = engineVariant;
    configureEngineVariant(engineVariant);
  }, [configureEngineVariant, engineVariant]);

  useEffect(() => {
    if (appliedThreadsRef.current === normalizedThreads) return;
    appliedThreadsRef.current = normalizedThreads;
    configureThreads(normalizedThreads);
  }, [configureThreads, normalizedThreads]);

  useEffect(() => {
    if (appliedMultiPvRef.current === normalizedMultiPv) return;
    appliedMultiPvRef.current = normalizedMultiPv;
    configureMultiPv(normalizedMultiPv);
  }, [configureMultiPv, normalizedMultiPv]);

  useEffect(() => {
    if (!isReady) return;
    if (appliedEloRef.current === normalizedElo) return;
    appliedEloRef.current = normalizedElo;
    configureStrengthElo(normalizedElo);
  }, [configureStrengthElo, normalizedElo, isReady]);

  const settingsSignature = useMemo(
    () => `${engineVariant}|${analysisDepth}|${normalizedThreads}|${normalizedMultiPv}|${normalizedElo}`,
    [analysisDepth, engineVariant, normalizedElo, normalizedMultiPv, normalizedThreads],
  );

  useEffect(() => {
    if (!isReady) return;
    analyzePosition(game.fen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, settingsSignature]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const verboseHistory = game.history({ verbose: true }) as Array<{ from: string; to: string; promotion?: string; san: string }>;
      if (verboseHistory.length === 0) {
        setBestSuggestion(null);
        return;
      }
      try {
        const { fens, uciMoves } = getEvaluateGameParams(game);
        if (!fens.length || !uciMoves.length) {
          setBestSuggestion(null);
          return;
        }
        const evals = await pool.evaluateFensLocal(fens, {
          depth: Math.max(8, Math.min(analysisDepth, 16)),
          mpv: Math.max(analysisMultiPv, 3),
          workers: 1,
          threadsPerWorker: 1,
          variant: (engineVariant || 'sf17-lite') as any,
        });
        if (cancelled) return;
        const positions = fens.map((_, idx) => {
          const res = evals[idx] || { lines: [] };
          return {
            bestMove: res.bestMove,
            lines: (res.lines || []).map((line) => ({
              pv: line.pv,
              cp: line.cp,
              mate: line.mate,
              depth: line.depth,
              multiPv: line.multiPv,
            })),
          } as PositionEval;
        });
        const classified = getMovesClassification(positions, uciMoves, fens);
        const lastIdx = classified.length - 1;
        const lastEval = classified[lastIdx];
        const prevEval = classified[lastIdx - 1];
        const lastMoveVerbose = verboseHistory[verboseHistory.length - 1];
        const lastUci = uciMoves[uciMoves.length - 1];
        const classification = lastEval?.moveClassification ?? MoveClassification.Best;
        const icon = CLASSIFICATION_ICON[classification] ?? DEFAULT_CLASSIFICATION_ICON;
        let openingName = lastEval?.opening || prevEval?.opening;
        if (!openingName) {
          const lastFen = fens[lastIdx];
          const openingMatch = openings.find((opening) => opening.fen === lastFen);
          openingName = openingMatch?.name;
        }
        const bestUci = prevEval?.bestMove;
        let bestSan: string | undefined;
        if (bestUci && fens[lastIdx - 1]) {
          bestSan = moveLineUciToSan(fens[lastIdx - 1])(bestUci);
        }
        const san = lastMoveVerbose?.san || moveLineUciToSan(fens[lastIdx - 1] || game.fen())(lastUci);
        const uci = lastMoveVerbose ? `${lastMoveVerbose.from}${lastMoveVerbose.to}${lastMoveVerbose.promotion || ''}` : lastUci;
        setBestSuggestion({
          uci,
          san,
          classification,
          icon,
          openingName,
          bestSan,
          bestUci,
        });
      } catch {
        if (!cancelled) setBestSuggestion(null);
      }
    })();
    return () => { cancelled = true; };
  }, [analysisDepth, analysisMultiPv, engineVariant, game, pool]);

  const movesList = useMemo(() => {
    const verbose = game.history({ verbose: true }) as any[];
    const pairs: { ply: number; white?: string; black?: string }[] = [];
    for (let i = 0; i < verbose.length; i += 2) {
      pairs.push({
        ply: (i / 2) + 1,
        white: verbose[i]?.san,
        black: verbose[i + 1]?.san,
      });
    }
    return pairs;
  }, [game]);

  const bestMoveSan = useMemo(() => {
    if (!lastAnalysisMove) return null;
    try {
      const cloned = new Chess(lastAnalyzedFenRef.current);
      const move = cloned.move({
        from: lastAnalysisMove.slice(0, 2) as Square,
        to: lastAnalysisMove.slice(2, 4) as Square,
        promotion: (lastAnalysisMove[4] || 'q') as any,
      });
      return move?.san || lastAnalysisMove;
    } catch {
      return lastAnalysisMove;
    }
  }, [lastAnalysisMove]);

  const recommendedSan = bestSuggestion?.bestSan ?? bestMoveSan;
  const recommendedUci = bestSuggestion?.bestUci ?? lastAnalysisMove ?? undefined;

  const boardKey = useMemo(() => `HomeBoard-${game.fen().split(' ')[0]}`, [game]);
  const boardOrientation = useMemo<'white' | 'black'>(() => 'white', []);
  const settings = useMemo<HomeAnalysisSettings>(() => ({
    variant: engineVariant,
    depth: analysisDepth,
    multiPv: analysisMultiPv,
    threads: analysisThreads,
    elo: analysisElo,
  }), [analysisDepth, analysisElo, analysisMultiPv, analysisThreads, engineVariant]);

  const clampDepthValue = (value: number) => Math.max(6, Math.min(30, Math.round(value)));
  const clampMultiPvValue = (value: number) => Math.max(1, Math.min(6, Math.round(value)));
  const clampThreadsValue = (value: number) => Math.max(1, Math.min(16, Math.round(value)));
  const clampEloValue = (value: number) => Math.max(1320, Math.min(3190, Math.round(value / 10) * 10));

const handleSettingsChange = useCallback((next: HomeAnalysisSettings) => {
  setEngineVariantPreference(next.variant);
  setAnalysisDepth(clampDepthValue(next.depth));
  setAnalysisMultiPv(clampMultiPvValue(next.multiPv));
  setAnalysisThreads(clampThreadsValue(next.threads));
  setAnalysisElo(clampEloValue(next.elo));
  setLastAnalysisMove(null);
  setBestSuggestion(null);
}, [setAnalysisDepth, setAnalysisElo, setAnalysisMultiPv, setAnalysisThreads, setEngineVariantPreference]);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2.5, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(12,12,18,0.75)', display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2.5, lg: 3.5 }, alignItems: 'stretch', width: '100%', maxWidth: { xs: '100%', xl: 1100 } }}>
      <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ flex: 1.6, minWidth: 0 }}>
        <Box sx={{ width: boardSize, maxWidth: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Chessboard
            key={boardKey}
            options={{
              id: 'HomeBoard',
              position: game.fen().split(' ')[0],
              boardOrientation,
              showNotation: false,
              boardStyle: {
                borderRadius: 5,
                boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
                width: boardSize,
                maxWidth: '100%',
                aspectRatio: '1 / 1',
              },
              animationDurationInMs: 200,
              canDragPiece: ({ piece }) => {
                if (engineThinking) return false;
                const side = piece.pieceType[0];
                return side === (game.turn() === 'w' ? 'w' : 'b');
              },
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                if (!targetSquare) return false;
                return handleUserMove(sourceSquare, targetSquare);
              },
              onSquareClick: ({ square }) => onSquareClick(square),
              pieces: ['wP', 'wB', 'wN', 'wR', 'wQ', 'wK', 'bP', 'bB', 'bN', 'bR', 'bQ', 'bK'].reduce((acc: any, code: string) => {
                acc[code] = () => (
                  <img
                    src={`/piece/chicago/${code}.svg`}
                    alt={code}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
                  />
                );
                return acc;
              }, {}),
              arrows: (showHintArrow && lastAnalysisMove) ? [{ startSquare: lastAnalysisMove.slice(0, 2), endSquare: lastAnalysisMove.slice(2, 4), color: '#22c55e' }] : [],
              squareRenderer: ({ children, square }: any) => {
                const isSelected = square === selectedSquare;
                const isPlayable = validMoves.includes(square);
                const lastMoveSquare = bestSuggestion?.uci.slice(2, 4);
                const rings: string[] = [];
                if (isSelected) rings.push('inset 0 0 0 4px rgba(59,130,246,.7)');
                if (isPlayable) rings.push('inset 0 0 0 4px rgba(16,185,129,.85)');
                const style = rings.length ? { boxShadow: rings.join(', ') } : {};
                return (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {children}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }} />
                    {bestSuggestion && square === lastMoveSquare ? (
                      <img
                        src={bestSuggestion.icon}
                        alt={bestSuggestion.classification}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, pointerEvents: 'none' }}
                      />
                    ) : null}
                  </div>
                );
              },
            }}
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <Button variant="outlined" size="small" onClick={undo} fullWidth>Undo</Button>
          <Button variant="outlined" size="small" onClick={restart} fullWidth>Restart</Button>
        </Stack>
      </Stack>

      <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', lg: 'block' }, borderColor: 'rgba(255,255,255,0.08)' }} />
      <Divider flexItem orientation="horizontal" sx={{ display: { xs: 'block', lg: 'none' }, borderColor: 'rgba(255,255,255,0.08)' }} />

      <Stack spacing={1.5} sx={{ flex: 1, minWidth: { xs: '100%', lg: 320 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="subtitle1">Self Analysis Board</Typography>
            <Typography variant="caption" color="text.secondary">{isReady ? 'Stockfish ready' : 'Loading engine…'}</Typography>
          </Box>
          <HomeAnalysisSettingsButton settings={settings} onChange={handleSettingsChange} />
        </Stack>
        <FormControlLabel control={<Switch checked={showHintArrow} onChange={(_, v) => setShowHintArrow(v)} size="small" />} label="Show hint arrow" sx={{ mt: -1 }} />
        {bestSuggestion ? (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.5, borderColor: 'rgba(34,197,94,0.35)', background: 'linear-gradient(180deg, rgba(34,197,94,0.12), rgba(13,148,136,0.08))' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <img src={bestSuggestion.icon} alt={bestSuggestion.classification} width={28} height={28} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {bestSuggestion.san} is {classificationLabel(bestSuggestion.classification)}
              </Typography>
            </Stack>
            {bestSuggestion.bestSan && ![MoveClassification.Best, MoveClassification.Forced, MoveClassification.Opening].includes(bestSuggestion.classification) ? (
              <Typography variant="body2" sx={{ color: '#16a34a', pl: 4.5 }}>The best move was {bestSuggestion.bestSan}</Typography>
            ) : null}
            {bestSuggestion.openingName ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', pl: 4.5 }}>{bestSuggestion.openingName}</Typography>
            ) : null}
          </Paper>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ flex: 1, height: 14, borderRadius: 999, background: 'linear-gradient(90deg,#18181b,#1f2937)', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${100 - evalPercent}%`,
              width: 4,
              bgcolor: 'primary.main',
              boxShadow: '0 0 8px rgba(34,211,238,0.75)',
            }}
            />
          </Box>
          <Typography variant="body2" sx={{ minWidth: 56, textAlign: 'right' }}>{formatScore(info?.score, info?.mate)}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {engineThinking ? 'Engine analyzing current position…' : 'Analysis up to date.'} Depth {info?.depth ?? 0}
        </Typography>

        <Box>
          <Typography variant="subtitle2" gutterBottom>Best Move</Typography>
          <Typography variant="body2">
            {recommendedSan ? `${recommendedSan}${recommendedUci ? ` (${recommendedUci})` : ''}` : '—'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>Top Lines</Typography>
          <Stack spacing={1}>
            {(lines || []).slice(0, 3).map((line, idx) => {
              const label = line.mate !== undefined ? `M${line.mate}` : (line.score !== undefined ? (line.score / 100).toFixed(2) : 'N/A');
              const pv = (line.pv || '').split(' ').slice(0, 8).join(' ');
              return (
                <Box key={`pv-${idx}`} sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <Typography variant="caption" color="primary.main">#{idx + 1} · {label}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{pv || '...'}</Typography>
                </Box>
              );
            })}
            {(!lines || !lines.length) && (
              <Typography variant="body2" color="text.secondary">Waiting for the engine to produce lines…</Typography>
            )}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>Moves</Typography>
          <Stack spacing={0.5} sx={{ maxHeight: 160, overflowY: 'auto', pr: 1 }}>
            {movesList.length === 0 && <Typography variant="body2" color="text.secondary">No moves yet — make the first move to begin.</Typography>}
            {movesList.map((ply) => (
              <Stack key={`move-${ply.ply}`} direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ minWidth: 24 }}>{ply.ply}.</Typography>
                <Typography variant="body2" sx={{ minWidth: 60 }}>{ply.white || ''}</Typography>
                <Typography variant="body2" sx={{ minWidth: 60 }}>{ply.black || ''}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
