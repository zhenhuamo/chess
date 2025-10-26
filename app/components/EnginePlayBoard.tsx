'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { useStockfish } from '../hooks/useStockfish';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Box, Button, Paper, Stack, Typography, Switch, FormControlLabel, Divider } from '@mui/material';
import { Chessboard } from 'react-chessboard';
import { useStockfishPool } from '../hooks/useStockfishPool';
import { getEvaluateGameParams, moveLineUciToSan } from '@/src/lib/chess';
import { getMovesClassification } from '@/src/lib/engine/helpers/moveClassification';
import type { MoveClassification } from '@/src/types/enums';
import { playSoundFromMove, playMoveSound } from '@/src/lib/sounds';
import { usePlayState } from '../play/PlayState';
import GameInProgress from '../play/GameInProgress';
import GameSettingsButton from '../play/GameSettingsButton';
import GameRecap from '../play/GameRecap';
import { formatGameToDatabase, setGameHeaders } from '@/src/lib/chess';

type EngineVariant = 'sf17'|'sf17-lite'|'sf17-single'|'sf161'|'sf161-lite'|'sf161-single'|'sf16-nnue'|'sf16-nnue-single'|'sf11';
export default function EnginePlayBoard({ config }: { config?: { variant?: EngineVariant; threads?: number; elo?: number; youPlay?: 'w'|'b'; starting?: string } }) {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [engineThinking, setEngineThinking] = useState(false);
  const [elo, setElo] = useLocalStorage<number>('engine-elo', 1600);
  const { isReady, analyze, analyzePreferCloud, analysis, setStrengthElo, threads, setThreads, engineVariant, setEngineVariant, info } = useStockfish();
  const [liveEval, setLiveEval] = useLocalStorage<boolean>('play-live-eval', true);
  const [showHintArrow, setShowHintArrow] = useLocalStorage<boolean>('play-show-hint', true);
  const [userPlays, setUserPlays] = useLocalStorage<'w'|'b'>('play-side', 'w');
  const [hint, setHint] = useState<string | null>(null);
  const hintRequestedRef = useRef(false);
  const pool = useStockfishPool();
  const [clsByPly, setClsByPly] = useState<Record<number, MoveClassification | undefined>>({});
  const [bestByPly, setBestByPly] = useState<Record<number, string | undefined>>({});

  useEffect(() => {
    if (isReady) setStrengthElo(elo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // Apply external config (variant/threads/elo/side/starting position)
  const initializedRef = useState(false)[0] as unknown as { current?: boolean };
  // Helper: clone current game preserving full history (headers + moves)
  const copyGame = (src: Chess): Chess => {
    try {
      const cloned = new Chess();
      cloned.loadPgn(src.pgn());
      return cloned;
    } catch {
      // Fallback to FEN if PGN parsing fails (should be rare)
      return new Chess(src.fen());
    }
  };

  useEffect(() => {
    if (!config) return;
    if (config.variant) setEngineVariant(config.variant);
    if (typeof config.threads === 'number') setThreads(config.threads);
    if (typeof config.elo === 'number') { setElo(config.elo); setStrengthElo(config.elo); }
    if (config.youPlay) setUserPlays(config.youPlay);
    if (!initializedRef.current && config.starting) {
      try {
        const text = config.starting.trim();
        const custom = new Chess();
        if (text.includes('/') && text.split(' ').length >= 4) {
          // FEN heuristic
          custom.load(text);
        } else {
          // PGN fallback
          custom.loadPgn(text);
        }
        setGame(custom);
        setSelectedSquare(null);
        setValidMoves([]);
      } catch {}
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // If engine plays white at start, make the first move
  useEffect(() => {
    if (!isReady) return;
    if (game.history().length === 0 && userPlays === 'b' && !engineThinking) {
      setEngineThinking(true);
      analyzePreferCloud(game.fen(), 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, userPlays]);

  useEffect(() => {
    if (!analysis || !engineThinking) return;
    const move = analysis.bestMove;
    if (!move || move === '(none)') return;
    try {
      const next = copyGame(game);
      const result = next.move({ from: move.slice(0, 2) as Square, to: move.slice(2, 4) as Square, promotion: (move[4] || undefined) as any });
      setGame(next);
      try { setLastPgn(next.pgn()); } catch {}
      // autosave draft after engine move
      persistDraft(next);
      try { if (next.isCheck()) playMoveSound(); else playSoundFromMove(result as any); } catch {}
      setEngineThinking(false);
      if (typeof next.isGameOver === 'function' && next.isGameOver()) {
        try { setLastPgn(next.pgn()); } catch {}
        try { endGame(); } catch {}
      }
    } catch {
      setEngineThinking(false);
    }
  }, [analysis]);

  const handleUserMove = (from: string, to: string) => {
    try {
      const next = copyGame(game);
      const result = next.move({ from: from as Square, to: to as Square, promotion: 'q' });
      setGame(next);
      try { setLastPgn(next.pgn()); } catch {}
      // autosave draft after player move
      persistDraft(next);
      try { if (next.isCheck()) playMoveSound(); else playSoundFromMove(result as any); } catch {}
      if (typeof next.isGameOver === 'function' && next.isGameOver()) {
        try { setLastPgn(next.pgn()); } catch {}
        try { endGame(); } catch {}
      }
      // Ask engine to respond
      if ((userPlays === 'w' && next.turn() === 'b') || (userPlays === 'b' && next.turn() === 'w')) {
        setEngineThinking(true);
        analyzePreferCloud(next.fen(), 14);
      }
    } catch {
      // ignore invalid
    }
  };

  const onSquareClick = (sq: string) => {
    if (engineThinking) return;
    // Prevent clicking when it's not user's turn
    if ((userPlays === 'w' && game.turn() !== 'w') || (userPlays === 'b' && game.turn() !== 'b')) return;
    if (selectedSquare) {
      const moves = game.moves({ square: selectedSquare as Square, verbose: true });
      const ok = moves.some((m: any) => m.to === sq);
      if (ok) {
        handleUserMove(selectedSquare, sq);
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }
    setSelectedSquare(sq);
    const moves = game.moves({ square: sq as Square, verbose: true });
    setValidMoves(moves.map((m: any) => m.to));
  };

  // Live evaluation when idle
  useEffect(() => {
    if (!liveEval || engineThinking) return;
    analyzePreferCloud(game.fen(), 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen(), liveEval, engineThinking]);

  // Lightweight move classification when live-eval is enabled
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!liveEval) return;
      try {
        const { fens, uciMoves } = getEvaluateGameParams(game as any);
        if (!fens?.length) return;
        const local = await pool.evaluateFensLocal(fens, { depth: 12, mpv: 3, workers: 1, threadsPerWorker: 1, variant: (engineVariant || 'sf17-lite') as any });
        const positions: any[] = [];
        for (let i = 0; i < fens.length; i++) {
          const res: any = local[i] || { lines: [] };
          positions.push({ bestMove: res.bestMove, lines: (res.lines||[]).map((l:any)=>({ pv: l.pv, cp: l.cp, mate: l.mate, depth: l.depth, multiPv: l.multiPv })) });
        }
        const arr = getMovesClassification(positions as any, uciMoves, fens);
        if (cancelled) return;
        const clsMap: Record<number, MoveClassification | undefined> = {};
        const bestMap: Record<number, string | undefined> = {};
        for (let idx = 1; idx < arr.length; idx++) {
          const p = arr[idx] as any;
          clsMap[idx] = p?.moveClassification;
          const bestUci = (arr[idx-1] as any)?.bestMove as string | undefined; // best move before this ply
          if (bestUci) {
            try { bestMap[idx] = moveLineUciToSan(fens[idx-1])(bestUci); } catch {}
          }
        }
        setClsByPly(clsMap);
        setBestByPly(bestMap);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [game, liveEval, engineVariant]);

  // Map piece to chicago SVG path under public/piece/chicago
  const pieceSrc = (piece: any): string | null => {
    if (!piece) return null;
    const prefix = piece.color === 'w' ? 'w' : 'b';
    const codeMap: Record<string, string> = { p: 'P', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
    const code = codeMap[piece.type];
    if (!code) return null;
    return `/piece/chicago/${prefix}${code}.svg`;
  };

  const formatScore = (score?: number, mate?: number) => {
    if (typeof mate === 'number') return `${mate > 0 ? '' : '-'}M${Math.abs(mate)}`;
    if (typeof score === 'number') return (score / 100).toFixed(2);
    return 'N/A';
  };

  const getEvalBarWidth = (score?: number, mate?: number) => {
    if (typeof mate === 'number') return mate > 0 ? 98 : 2;
    if (typeof score === 'number') return Math.max(0, Math.min(100, 50 + score / 10));
    return 50;
  };

  // Vertical eval percent for the left bar
  const evalPercent = useMemo(() => {
    if (typeof info?.mate === 'number') return info.mate > 0 ? 98 : 2;
    if (typeof info?.score === 'number') return Math.max(0, Math.min(100, 50 + info.score / 10));
    return 50;
  }, [info]);

  // Undo and restart
  const undo = () => {
    try {
      const next = copyGame(game);
      next.undo();
      setGame(next);
      setSelectedSquare(null);
      setValidMoves([]);
    } catch {}
  };
  const restart = () => {
    const next = new Chess();
    setGame(next);
    setSelectedSquare(null);
    setValidMoves([]);
    // clear autosave draft when starting a fresh game
    try { localStorage.removeItem('play-draft-id'); } catch {}
    draftIdRef.current = null;
    if (userPlays === 'b') {
      setEngineThinking(true);
      analyzePreferCloud(next.fen(), 14);
    }
  };

  // Hint: run a shallow search and show suggested move
  const requestHint = () => {
    setHint(null);
    hintRequestedRef.current = true;
    analyze(game.fen(), 10);
    // we'll read analysis.bestMove on next tick (without engineThinking flag)
  };
  useEffect(() => {
    if (!engineThinking && analysis?.bestMove) {
      setHint(analysis.bestMove);
      hintRequestedRef.current = false;
    }
  }, [analysis, engineThinking]);
  // Also surface hint early from PV while thinking, so箭头能尽快出现
  useEffect(() => {
    if (!hintRequestedRef.current) return;
    const pv = (info?.pv || '').trim();
    if (!pv) return;
    const first = pv.split(' ')[0];
    if (!first || first === '(none)') return;
    // Only set if still no hint
    setHint((prev) => prev || first);
  }, [info]);

  // Highlight king in check
  const inCheck = game.isCheck();
  const findKingSquare = (color: 'w'|'b') => {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (sq && sq.type === 'k' && sq.color === color) {
          const file = 'abcdefgh'[f];
          const rank = String(8 - r);
          return (file + rank) as string;
        }
      }
    }
    return null;
  };
  const kingToHighlight = inCheck ? findKingSquare(game.turn()) : null;

  // On game end, store PGN into PlayState for recap + autosave helpers
  const { endGame, setLastPgn, config: playConfig } = usePlayState ? usePlayState() : ({ endGame: ()=>{}, setLastPgn: (_?:string)=>{}, config: {} } as any);

  // Autosave draft to IndexedDB: add once, then put on every move
  const draftIdRef = useRef<number | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem('play-draft-id'); if (raw) draftIdRef.current = Number(raw) || null; } catch {}
  }, []);

  const persistDraft = async (g: Chess) => {
    try {
      const { openDB } = await import('idb');
      const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { console.log('[DB][upgrade] creating store "games"'); db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
      const engineLabel = (() => {
        const v = playConfig?.variant || 'sf17-lite';
        if (String(v).startsWith('sf17')) return 'Stockfish 17';
        if (String(v).startsWith('sf161')) return 'Stockfish 16.1';
        if (String(v).startsWith('sf16')) return 'Stockfish 16';
        if (String(v).startsWith('sf11')) return 'Stockfish 11';
        return 'Stockfish';
      })();
      const whiteIsYou = (playConfig?.youPlay ?? 'w') === 'w';
      try { setGameHeaders(g, { white: { name: whiteIsYou ? 'You' : engineLabel }, black: { name: whiteIsYou ? engineLabel : 'You' } }); } catch {}
      const meta = { playerSide: playConfig?.youPlay, origin: 'play', engineVariant: playConfig?.variant } as any;

      if (draftIdRef.current) {
        const id = draftIdRef.current;
        const prev = await db.get('games', id);
        const rec = { ...(prev||{}), ...(formatGameToDatabase(g) as any), ...meta, id } as any;
        await db.put('games', rec);
        console.log('[DB][autosave] put id=', id, 'moves=', g.history().length);
        return id;
      } else {
        const rec = { ...(formatGameToDatabase(g) as any), ...meta } as any;
        const id = (await db.add('games', rec)) as unknown as number;
        draftIdRef.current = id;
        try { localStorage.setItem('play-draft-id', String(id)); } catch {}
        console.log('[DB][autosave] add new id=', id, 'moves=', g.history().length);
        return id;
      }
    } catch (e) {
      console.warn('[DB][autosave] failed', e);
      return null;
    }
  };

  // Responsive board sizing container
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'flex-start' }} ref={wrapperRef}>
      {/* Left: board with eval bar */}
      <Box>
        <Stack direction="row" spacing={2}>
          {/* Vertical eval bar */}
          <Box sx={{ position: 'relative', width: 14, borderRadius: 2, overflow: 'hidden', bgcolor: 'linear-gradient(180deg, #0a0a0a, #666, #f5f5f5)' as any, background: 'linear-gradient(180deg, #0a0a0a, #666, #f5f5f5)' }}>
            <Box sx={{ position: 'absolute', left: 0, right: 0, top: `${100 - evalPercent}%` }}>
              <Box sx={{ ml: -0.5, width: 20, height: 2, bgcolor: 'primary.main', boxShadow: '0 0 6px rgba(34,211,238,0.7)' }} />
            </Box>
            <Box sx={{ position: 'absolute', bottom: 6, left: 4, fontSize: 10, color: 'text.secondary' }}>{formatScore(info?.score, info?.mate)}</Box>
          </Box>

          {/* Board (react-chessboard v5) */}
          <Box sx={{ width: 'min(86vh, 86vw)', maxWidth: 760 }}>
            <Chessboard
              key={`PlayBoard-${game.fen().split(' ')[0]}`}
              options={{
                id: 'PlayBoard',
                position: game.fen().split(' ')[0],
                boardOrientation: (userPlays === 'w' ? 'white' : 'black'),
                boardStyle: { borderRadius: 5, boxShadow: '0 2px 10px rgba(0,0,0,0.5)' },
                animationDurationInMs: 200,
                // custom piece set (chicago) to match analysis board
                pieces: ['wP','wB','wN','wR','wQ','wK','bP','bB','bN','bR','bQ','bK'].reduce((acc: any, code: string) => {
                  acc[code] = () => <img src={`/piece/chicago/${code}.svg`} alt={code} style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }} />;
                  return acc;
                }, {}),
                // dragging rules
                canDragPiece: ({ piece }) => {
                  if (engineThinking) return false;
                  const side = piece.pieceType[0]; // 'w'|'b'
                  const turn = game.turn();
                  return (side === (turn==='w'?'w':'b')) && ((userPlays==='w' && turn==='w') || (userPlays==='b' && turn==='b'));
                },
                onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
                  if (!targetSquare) return false;
                  // route to our existing handler
                  handleUserMove(sourceSquare, targetSquare);
                  return true;
                },
                // clicking 选中->下子逻辑 + overlays
                onSquareClick: ({ square }) => onSquareClick(square),
                arrows: (showHintArrow && hint) ? [{ startSquare: hint.slice(0,2), endSquare: hint.slice(2,4), color: '#22c55e' }] : [],
                squareRenderer: ({ children, square }: any) => {
                  const isSelected = square === selectedSquare;
                  const isPlayable = validMoves.includes(square);
                  const rings: string[] = [];
                  if (isSelected) rings.push('inset 0 0 0 4px rgba(59,130,246,.7)');
                  if (isPlayable) rings.push('inset 0 0 0 4px rgba(16,185,129,.8)');
                  if (kingToHighlight === square) rings.push('inset 0 0 0 4px rgba(239,68,68,.9)');
                  const style = rings.length ? { boxShadow: rings.join(', ') } : {};
                  // Badge for the last move classification
                  const hist = game.history({ verbose: true }) as any[];
                  const last = hist[hist.length - 1];
                  const lastDest: string | undefined = last?.to;
                  const lastCls = clsByPly[hist.length];
                  const iconMap: any = { Splendid:'splendid', Perfect:'perfect', Excellent:'excellent', Best:'best', Okay:'okay', Inaccuracy:'inaccuracy', Mistake:'mistake', Blunder:'blunder', Forced:'forced', Opening:'opening' };
                  const badge = (lastDest === square && lastCls) ? `/icons/${iconMap[String(lastCls)]||'best'}.png` : undefined;
                  return (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      {children}
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }} />
                      {badge ? (<img src={badge} alt="cls" style={{ position:'absolute', right: 4, top: 4, width: 18, height: 18, pointerEvents:'none' }} />) : null}
                    </div>
                  );
                },
              }}
            />
          </Box>
        </Stack>

        {/* action buttons under board */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button size="small" variant="outlined" onClick={undo}>Undo</Button>
          <Button size="small" variant="outlined" onClick={restart}>Restart</Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" onClick={requestHint}>Hint</Button>
        </Stack>
      </Box>

      {/* Right: small status panel */}
      <Paper variant="outlined" sx={{ p: 2, width: 360, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle1">Status</Typography>
        <Typography variant="body2">{engineThinking? 'Engine thinking…':'Your move'}</Typography>
        <FormControlLabel control={<Switch checked={liveEval} onChange={(_,v)=> setLiveEval(v)} size="small" />} label="Live evaluation" sx={{ mt: -1 }} />
        <FormControlLabel control={<Switch checked={showHintArrow} onChange={(_,v)=> setShowHintArrow(v)} size="small" />} label="Show hint arrow" sx={{ mt: -1 }} />
        <Box>
          <Typography variant="caption" color="text.secondary">Eval</Typography>
          <Box sx={{ width: '100%', bgcolor: 'grey.800', borderRadius: 1, height: 8, overflow: 'hidden', mt: 0.5 }}>
            <Box sx={{ height: '100%', bgcolor: 'primary.main', width: `${getEvalBarWidth(info?.score, info?.mate)}%`, transition: 'width .2s ease' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">{formatScore(info?.score, info?.mate)} · Depth {info?.depth ?? 0}</Typography>
        </Box>
        {/* Realtime move assessment card */}
        {(() => {
          const hist = game.history({ verbose: true }) as any[];
          const ply = hist.length;
          if (!liveEval || ply === 0) return null;
          const last = hist[ply-1];
          const cls = clsByPly[ply];
          if (!cls || !last?.san) return null;
          const colorMap: any = { Splendid:'#22d3ee', Perfect:'#38bdf8', Excellent:'#22c55e', Best:'#10b981', Okay:'#84cc16', Inaccuracy:'#eab308', Mistake:'#f97316', Blunder:'#ef4444', Forced:'#94a3b8', Opening:'#94a3b8' };
          const iconMap: any = { Splendid:'splendid', Perfect:'perfect', Excellent:'excellent', Best:'best', Okay:'okay', Inaccuracy:'inaccuracy', Mistake:'mistake', Blunder:'blunder', Forced:'forced', Opening:'opening' };
          const bestSan = bestByPly[ply];
          return (
            <Box sx={{ mt: 1.25, p: 1, borderRadius: 1.5, bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <img src={`/icons/${iconMap[String(cls)]||'best'}.png`} alt="cls" width={18} height={18} />
                <Typography variant="body2" sx={{ color: colorMap[String(cls)]||'inherit', fontWeight: 700 }}>{last.san} is {String(cls).toLowerCase()}</Typography>
              </Stack>
              {bestSan && (
                <Typography variant="body2" sx={{ color: '#16a34a', mt: 0.5 }}>The best move was {bestSan}</Typography>
              )}
            </Box>
          );
        })()}
        {/* Moves split columns: You vs Engine */}
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">Moves</Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto', pr: 1 }}>
            <Stack direction="row" spacing={1}>
              <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color:'text.secondary' }}>You</Typography>
              <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color:'text.secondary' }}>Engine</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack spacing={0.25}>
              {(() => {
                const hist = game.history({ verbose: true }) as any[];
                const rows: Array<{ no:number; w?: any; b?: any }> = [];
                for (let i=0;i<hist.length;i++) { const mv=hist[i]; const no=Math.floor(i/2)+1; const r=rows[no-1]||{no}; (i%2===0? (r.w=mv) : (r.b=mv)); rows[no-1]=r; }
                return rows.map((r, idx) => {
                  const wSan = r.w?.san as string|undefined;
                  const bSan = r.b?.san as string|undefined;
                  const wCls = liveEval ? clsByPly[idx*2+1] : undefined; const bCls = liveEval ? clsByPly[idx*2+2] : undefined;
                  const colorMap: any = { Brilliant:'#22d3ee', Great:'#38bdf8', Good:'#22c55e', Best:'#10b981', Okay:'#84cc16', Inaccuracy:'#eab308', Mistake:'#f97316', Blunder:'#ef4444' };
                  const wColor = wCls ? (colorMap[String(wCls)]||'#999') : '#999';
                  const bColor = bCls ? (colorMap[String(bCls)]||'#999') : '#999';
                  return (
                    <Stack key={r.no} direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ width: 16, color:'text.secondary', textAlign:'right' }}>{r.no}.</Typography>
                      <Stack sx={{ flex:1 }} direction="row" spacing={0.5} alignItems="center">
                        {wSan ? (<><Box sx={{ width: 8, height: 8, bgcolor: wColor, borderRadius: 10 }} /><Typography variant="caption" sx={{ fontFamily:'monospace' }}>{wSan}</Typography></>) : <Typography variant="caption" color="text.disabled">–</Typography>}
                      </Stack>
                      <Stack sx={{ flex:1 }} direction="row" spacing={0.5} alignItems="center">
                        {bSan ? (<><Box sx={{ width: 8, height: 8, bgcolor: bColor, borderRadius: 10 }} /><Typography variant="caption" sx={{ fontFamily:'monospace' }}>{bSan}</Typography></>) : <Typography variant="caption" color="text.disabled">–</Typography>}
                      </Stack>
                    </Stack>
                  );
                });
              })()}
            </Stack>
          </Box>
        </Box>

        {/* Integrated settings + recap to form a unified sidebar */}
        <Divider sx={{ my: 1 }} />
        <GameInProgress />
        <GameSettingsButton />
        <GameRecap />
      </Paper>
    </Box>
  );
}
