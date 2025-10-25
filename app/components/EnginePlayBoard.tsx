'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { useStockfish } from '../hooks/useStockfish';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { usePlayState } from '../play/PlayState';
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
  const [userPlays, setUserPlays] = useLocalStorage<'w'|'b'>('play-side', 'w');
  const [hint, setHint] = useState<string | null>(null);

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
      next.move({ from: move.slice(0, 2) as Square, to: move.slice(2, 4) as Square, promotion: (move[4] || undefined) as any });
      setGame(next);
      try { setLastPgn(next.pgn()); } catch {}
      // autosave draft after engine move
      persistDraft(next);
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
      next.move({ from: from as Square, to: to as Square, promotion: 'q' });
      setGame(next);
      try { setLastPgn(next.pgn()); } catch {}
      // autosave draft after player move
      persistDraft(next);
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
    analyze(game.fen(), 10);
    // we'll read analysis.bestMove on next tick (without engineThinking flag)
  };
  useEffect(() => {
    if (!engineThinking && analysis?.bestMove) {
      setHint(analysis.bestMove);
    }
  }, [analysis, engineThinking]);

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

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['8','7','6','5','4','3','2','1'];

  // Responsive board sizing
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [sq, setSq] = useState<number>(64);
  useEffect(() => {
    const calc = () => {
      const w = wrapperRef.current?.offsetWidth || window.innerWidth;
      const h = window.innerHeight;
      // Leave space for side panels and paddings
      const avail = Math.min(w - 80, h - 220);
      const s = Math.max(48, Math.min(88, Math.floor((avail > 0 ? avail : 512) / 8)));
      setSq(s);
    };
    calc();
    let ro: any = undefined;
    const Rz = (window as any).ResizeObserver;
    if (Rz) {
      ro = new Rz(() => calc());
      if (wrapperRef.current) ro.observe(wrapperRef.current);
    }
    const onResize = () => calc();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); try { ro && ro.disconnect && ro.disconnect(); } catch {} };
  }, []);

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

          {/* Board with coordinates */}
          <Box>
            {/* files top */}
            <Stack direction="row" spacing={0.5} sx={{ pl: 3.5, pr: 3.5, mb: 0.5 }}>
              {files.map((f) => (
                <Box key={`ft-${f}`} sx={{ width: sq, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{f}</Box>
              ))}
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {/* ranks left */}
              <Stack spacing={0.5} sx={{ mr: 0.5 }}>
                {ranks.map((r) => (
                  <Box key={`rl-${r}`} sx={{ width: 24, height: sq, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{r}</Box>
                ))}
              </Stack>
              {/* squares */}
              <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
                {ranks.map((rank) => (
                  <Stack direction="row" key={`r-${rank}`}>
                    {files.map((file) => {
                      const square = `${file}${rank}` as Square;
                      const isLight = (file.charCodeAt(0) + rank.charCodeAt(0)) % 2 === 0;
                      const isSelected = square === selectedSquare;
                      const isValidMove = validMoves.includes(square);
                      const piece = game.get(square as Square);
                      const hintFrom = hint && hint.slice(0,2)===square;
                      const hintTo = hint && hint.slice(2,4)===square;
                      const shadows: string[] = [];
                      if (isValidMove) shadows.push('inset 0 0 0 4px rgba(16,185,129,.7)');
                      if (kingToHighlight===square) shadows.push('inset 0 0 0 4px rgba(239,68,68,.9)');
                      if (hintFrom) shadows.push('inset 0 0 0 4px rgba(99,102,241,.8)');
                      if (hintTo) shadows.push('inset 0 0 0 4px rgba(79,70,229,.9)');
                      return (
                        <Box key={square} component="button" onClick={()=>onSquareClick(square)} title={square}
                          sx={{ width: sq, height: sq, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider', bgcolor: isLight ? '#fde68a' : '#a16207', outline: isSelected ? '2px solid' : 'none', outlineColor: isSelected ? 'primary.main' : undefined, boxShadow: shadows.join(', '), cursor: 'pointer' }}>
                          {piece ? <img src={pieceSrc(piece) || ''} alt={square} style={{ width: Math.round(sq*0.85), height: Math.round(sq*0.85) }} /> : null}
                        </Box>
                      );
                    })}
                  </Stack>
                ))}
              </Paper>
              {/* ranks right */}
              <Stack spacing={0.5} sx={{ ml: 0.5 }}>
                {ranks.map((r) => (
                  <Box key={`rr-${r}`} sx={{ width: 24, height: sq, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{r}</Box>
                ))}
              </Stack>
            </Stack>
            {/* files bottom */}
            <Stack direction="row" spacing={0.5} sx={{ pl: 3.5, pr: 3.5, mt: 0.5 }}>
              {files.map((f) => (
                <Box key={`fb-${f}`} sx={{ width: sq, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{f}</Box>
              ))}
            </Stack>
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
      <Paper variant="outlined" sx={{ p: 2, width: 320, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle1">Status</Typography>
        <Typography variant="body2">{engineThinking? 'Engine thinking…':'Your move'}</Typography>
        <Box>
          <Typography variant="caption" color="text.secondary">Eval</Typography>
          <Box sx={{ width: '100%', bgcolor: 'grey.800', borderRadius: 1, height: 8, overflow: 'hidden', mt: 0.5 }}>
            <Box sx={{ height: '100%', bgcolor: 'primary.main', width: `${getEvalBarWidth(info?.score, info?.mate)}%`, transition: 'width .2s ease' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">{formatScore(info?.score, info?.mate)} · Depth {info?.depth ?? 0}</Typography>
        </Box>
      </Paper>
    </Box>
  );
}
