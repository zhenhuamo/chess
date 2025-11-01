import { Box, Divider, Stack, Typography } from "@mui/material";
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom, gameMetaAtom, currentPositionAtom } from "@/src/sections/analysis/states";
import { useMemo, useCallback, useEffect, useRef } from "react";
import { getEvaluateGameParams, moveLineUciToSan } from "@/src/lib/chess";
import { MoveClassification } from "@/src/types/enums";
import { useChessActions } from "@/src/hooks/useChessActions";

type MoveRow = {
  ply: number;
  color: 'w'|'b';
  san: string;
  delta: number; // centipawns for mover perspective
  cls: MoveClassification | undefined;
  bestSan?: string;
};

const clsLabel = (mc?: MoveClassification): string => {
  switch (mc) {
    case MoveClassification.Splendid: return 'Brilliant';
    case MoveClassification.Perfect: return 'Great';
    case MoveClassification.Excellent: return 'Good';
    case MoveClassification.Best: return 'Best';
    case MoveClassification.Okay: return 'Okay';
    case MoveClassification.Inaccuracy: return 'Inaccuracy';
    case MoveClassification.Mistake: return 'Mistake';
    case MoveClassification.Blunder: return 'Blunder';
    case MoveClassification.Forced: return 'Forced';
    case MoveClassification.Opening: return 'Opening';
    default: return '';
  }
};

function ClassificationIcon({ type, size = 16 }: { type: string; size?: number }) {
  const iconMap: Record<string, string> = {
    Brilliant: '/icons/splendid.png',
    Great: '/icons/perfect.png',
    Good: '/icons/excellent.png',
    Best: '/icons/best.png',
    Okay: '/icons/okay.png',
    Inaccuracy: '/icons/inaccuracy.png',
    Mistake: '/icons/mistake.png',
    Blunder: '/icons/blunder.png',
    Forced: '/icons/forced.png',
    Opening: '/icons/opening.png',
  };
  const src = iconMap[type];
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt={type}
      sx={{
        width: size,
        height: size,
        mr: 0.5,
        flexShrink: 0,
        filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.1))'
      }}
    />
  );
}

// Map SAN to a chess piece icon depending on the mover color
const PIECE_ICONS: Record<'w'|'b', Record<'P'|'N'|'B'|'R'|'Q'|'K', string>> = {
  w: { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔' },
  b: { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' },
};
const iconForSan = (san?: string, color: 'w'|'b' = 'w'): string => {
  if (!san) return '';
  // Castling uses king icon
  if (san.startsWith('O-O')) return PIECE_ICONS[color]['K'];
  // If SAN starts with piece letter, use it, otherwise it's a pawn move
  const head = san[0];
  const piece: 'P'|'N'|'B'|'R'|'Q'|'K' = (head && 'KQRBN'.includes(head)) ? (head as any) : 'P';
  return PIECE_ICONS[color][piece];
};

export default function MovesTab(props: any) {
  const gameEval = useAtomValue(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const meta = useAtomValue(gameMetaAtom);
  const currentPosition = useAtomValue(currentPositionAtom);
  const activePly = currentPosition?.currentMoveIdx ?? 0; // 0 = initial position
  // Use shared navigation helper so behavior matches GraphTab and toolbar
  const { goToMove } = useChessActions(boardAtom);

  // Build move rows from game + eval
  const { pairs, summary, labels } = useMemo(() => {
    const out = { pairs: [] as Array<{ no: number; w?: MoveRow; b?: MoveRow }>, summary: { player: {} as Record<string, number>, engine: {} as Record<string, number> }, labels: { player: 'Player', engine: 'Stockfish' } };
    try {
      const { fens, uciMoves } = getEvaluateGameParams(game);
      const verbose = game.history({ verbose: true }) as Array<{ san: string }>;
      const positions = gameEval?.positions || [];

      // Precompute white-oriented cp for each position
      const whiteCp: number[] = fens.map((fen, idx) => {
        const side = fen.split(' ')[1];
        const top = positions[idx]?.lines?.[0];
        let cp = 0;
        if (top) {
          if (typeof top.mate === 'number') cp = top.mate > 0 ? 100000 : -100000;
          else if (typeof top.cp === 'number') cp = top.cp;
        }
        return side === 'w' ? cp : -cp;
      });

      const playerColor: 'w'|'b' = meta?.playerSide === 'b' ? 'b' : 'w';
      const engineLabel = (() => {
        const v = meta?.engineVariant || 'sf17-lite';
        if (v.startsWith('sf17')) return 'Stockfish 17';
        if (v.startsWith('sf161')) return 'Stockfish 16.1';
        if (v.startsWith('sf16')) return 'Stockfish 16';
        if (v.startsWith('sf11')) return 'Stockfish 11';
        return 'Stockfish';
      })();
      out.labels = { player: 'You', engine: engineLabel };

      for (let i = 0; i < uciMoves.length; i++) {
        const color: 'w'|'b' = i % 2 === 0 ? 'w' : 'b';
        const san = verbose[i]?.san || uciMoves[i];
        const cls = positions[i+1]?.moveClassification;
        const bestUci = positions[i]?.lines?.[0]?.pv?.[0];
        const bestSan = bestUci ? moveLineUciToSan(fens[i])(bestUci) : undefined;

        const pre = whiteCp[i] ?? 0; // position before the move
        const post = whiteCp[i+1] ?? pre; // after played move
        const moverPre = color === 'w' ? pre : -pre;
        const moverPost = color === 'w' ? post : -post;
        const delta = moverPost - moverPre;

        const row: MoveRow = { ply: i+1, color, san, delta, cls, bestSan };
        const bucket = clsLabel(cls) || 'Best';
        const target = color === playerColor ? 'player' : 'engine';
        out.summary[target][bucket] = (out.summary[target][bucket] || 0) + 1;
        // pair rows by move number
        const no = Math.ceil((i+1)/2);
        const last = out.pairs[no-1] || { no };
        if (color === 'w') last.w = row; else last.b = row;
        out.pairs[no-1] = last;
      }
    } catch {}
    return out;
  }, [game, gameEval?.positions, meta?.playerSide, meta?.engineVariant]);

  // Jump helper: choose the correct base PGN (match GraphTab behavior)
  const jumpTo = useCallback((ply: number) => {
    const base = game.history().length > 0 ? game : board;
    console.log('[MovesTab] jumpTo ply=', ply, 'base.moves=', base.history().length);
    try {
      goToMove(ply, base);
    } catch (e) {
      console.warn('[MovesTab] goToMove failed', e);
    }
  }, [goToMove, game, board]);

  // Simple renderer for a vertical list with a draggable height handle
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    if (!activePly) return;
    const el = listRef.current.querySelector(`[data-ply="${activePly}"]`) as HTMLElement | null;
    if (el) {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
    }
  }, [activePly, pairs.length]);

  const Table = () => (
    <Box sx={{
      width:'100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}>
      <Stack
        spacing={0.2}
        sx={{
          overflow:'auto',
          maxHeight: '60vh',
          pr: 1,
          // Custom scrollbar styling
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'action.disabled',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: 'action.active',
            }
          }
        }}
        ref={listRef}
      >
        {pairs.map((r) => {
          const playerM = (meta?.playerSide||'w')==='w'? r.w : r.b;
          const engineM = (meta?.playerSide||'w')==='w'? r.b : r.w;
          const playerIcon = playerM ? iconForSan(playerM.san, playerM.color) : '';
          const engineIcon = engineM ? iconForSan(engineM.san, engineM.color) : '';
          const playerPly = (r.no-1)*2 + ((meta?.playerSide||'w')==='w'?1:2);
          const enginePly = (r.no-1)*2 + ((meta?.playerSide||'w')==='w'?2:1);
          const isActivePlayer = activePly === playerPly;
          const isActiveEngine = activePly === enginePly;

          return (
            <Stack
              key={r.no}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                py: 0.2,
                px: 0.5,
                flexShrink: 0,
                fontSize: '0.8rem',
                borderRadius: 0.5,
                transition: 'all 0.15s ease',
                position: 'relative',
                zIndex: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                  transform: 'translateX(2px)',
                }
              }}
            >
              <Typography variant="caption" sx={{ width: 20, color:'text.secondary', textAlign:'right', fontWeight: 600, fontSize: '0.75rem' }}>{r.no}.</Typography>

              {/* Player move */}
              <Box onClick={() => {
                if (playerM) {
                  const ply = (r.no-1)*2 + ((meta?.playerSide||'w')==='w'?1:2);
                  console.log('[MovesTab] Player move clicked: ply=', ply, 'playerM=', playerM.san);
                  jumpTo(ply);
                }
              }} data-ply={playerPly} sx={{ flex: 1, cursor: playerM ? 'pointer':'default', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.25, transition: 'all 0.15s ease', '&:active': { transform: playerM ? 'scale(0.95)' : 'none' }, position: 'relative', zIndex: 2, pointerEvents: 'auto', bgcolor: isActivePlayer ? 'action.selected' : undefined, borderRadius: 0.5, boxShadow: isActivePlayer ? 'inset 2px 0 0 0 rgba(25,118,210,.9)' : undefined }}>
                {playerM ? (
                  <>
                    <ClassificationIcon type={clsLabel(playerM.cls) || 'Best'} size={14} />
                    <Typography variant="body2" sx={{ fontFamily:'monospace', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '1rem' }}>{playerIcon}</span> {playerM.san}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '1rem' }}>–</Typography>
                )}
              </Box>

              {/* Engine move */}
              <Box onClick={() => {
                if (engineM) {
                  const ply = (r.no-1)*2 + ((meta?.playerSide||'w')==='w'?2:1);
                  console.log('[MovesTab] Engine move clicked: ply=', ply, 'engineM=', engineM.san);
                  jumpTo(ply);
                }
              }} data-ply={enginePly} sx={{ flex: 1, cursor: engineM ? 'pointer':'default', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.25, transition: 'all 0.15s ease', '&:active': { transform: engineM ? 'scale(0.95)' : 'none' }, position: 'relative', zIndex: 2, pointerEvents: 'auto', bgcolor: isActiveEngine ? 'action.selected' : undefined, borderRadius: 0.5, boxShadow: isActiveEngine ? 'inset 2px 0 0 0 rgba(25,118,210,.9)' : undefined }}>
                {engineM ? (
                  <>
                    <ClassificationIcon type={clsLabel(engineM.cls) || 'Best'} size={14} />
                    <Typography variant="body2" sx={{ fontFamily:'monospace', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '1rem' }}>{engineIcon}</span> {engineM.san}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '1rem' }}>–</Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );

  const SummaryRow = ({ side, data }: { side: string; data: Record<string, number> }) => {
    const order = ['Brilliant','Great','Good','Mistake','Blunder','Inaccuracy','Best','Okay','Forced','Opening'];
    return (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem', display: 'block', mb: 0.5 }}>{side}</Typography>
        <Stack spacing={1}>
          {order.map((k) => data[k] ? (
            <Box key={k} sx={{ display:'flex', alignItems:'center', gap: 0.5, bgcolor: 'action.hover', px: 0.5, py: 0.2, borderRadius: 0.5, minWidth: 'auto' }}>
              <ClassificationIcon type={k} size={16} />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>{k} <strong>{data[k]}</strong></Typography>
            </Box>
          ) : null)}
        </Stack>
      </Box>
    );
  };

  return (
    <Grid display="flex" flexDirection="column" gap={0.75} width="100%" {...props} sx={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="subtitle1" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Moves</Typography>
      </Box>

      {/* Two column layout: Moves table (left) and Classifications (right) */}
      <Grid display="flex" gap={1} width="100%" sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Moves table - takes more space */}
        <Box sx={{ flex: 1.3, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 0.5, px: 0.5, flexShrink: 0 }}>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>You</Typography>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>Stockfish</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Table />
          </Box>
        </Box>

        {/* Right: Classifications - split into two columns (You vs Engine) */}
        <Box sx={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0, overflow: 'hidden', minWidth: 200 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary', flexShrink: 0 }}>Classification</Typography>
          <Box sx={{ display: 'flex', gap: 1, overflow: 'hidden', flex: 1, minHeight: 0 }}>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <SummaryRow side={labels.player} data={summary.player || {}} />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <SummaryRow side={labels.engine} data={summary.engine || {}} />
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
