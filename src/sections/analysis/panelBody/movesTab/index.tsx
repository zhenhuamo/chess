import { Box, Divider, Stack, Typography } from "@mui/material";
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom, gameMetaAtom } from "@/src/sections/analysis/states";
import { useMemo, useCallback } from "react";
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

const clsColor: Record<string, string> = {
  Brilliant: '#22d3ee',
  Great: '#38bdf8',
  Good: '#22c55e',
  Best: '#10b981',
  Okay: '#84cc16',
  Inaccuracy: '#eab308',
  Mistake: '#f97316',
  Blunder: '#ef4444',
  Forced: '#94a3b8',
  Opening: '#94a3b8',
};

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  const em = size / 16; // Convert px to em (assuming 16px base font size)
  return <Box component="span" sx={{ display:'inline-flex', alignItems:'center', width: `${em}em`, height: `${em}em`, borderRadius:'50%', bgcolor: color, mr: 0.5, flexShrink: 0 }} />
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

  // Jump helper: choose the correct base PGN (match Chesskit behavior)
  // - If a full game PGN is loaded, navigate within that game
  // - Otherwise (eg. analysis-only board moves), navigate within the board state
  const jumpTo = useCallback((ply: number) => {
    const base = game.history().length > 0 ? game : board;
    console.log('[MovesTab] jumpTo ply=', ply, 'base.moves=', base.history().length);
    try {
      goToMove(ply, base);
    } catch (e) {
      console.warn('[MovesTab] goToMove failed', e);
    }
  }, [goToMove, game, board]);

  // Simple renderer for a vertical list - Traditional format with smooth scrolling
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
          // Make the moves list vertically resizable by user drag
          resize: 'vertical',
          overflow:'auto',
          height: 320,
          minHeight: 160,
          maxHeight: '70vh',
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
      >
        {pairs.map((r) => {
          const playerM = (meta?.playerSide||'w')==='w'? r.w : r.b;
          const engineM = (meta?.playerSide||'w')==='w'? r.b : r.w;
          const playerIcon = playerM ? iconForSan(playerM.san, playerM.color) : '';
          const engineIcon = engineM ? iconForSan(engineM.san, engineM.color) : '';
          const playerDot = playerM ? clsColor[clsLabel(playerM.cls) || ''] || '#999' : '#999';
          const engineDot = engineM ? clsColor[clsLabel(engineM.cls) || ''] || '#999' : '#999';

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
              }} sx={{ flex: 1, cursor: playerM ? 'pointer':'default', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.25, transition: 'all 0.15s ease', '&:active': { transform: playerM ? 'scale(0.95)' : 'none' } }}>
                {playerM ? (
                  <>
                    <Dot color={playerDot} size={4} />
                    <Typography variant="caption" sx={{ fontFamily:'monospace', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 'inherit' }}>{playerIcon}</span>{playerM.san}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.73rem' }}>–</Typography>
                )}
              </Box>

              {/* Engine move */}
              <Box onClick={() => {
                if (engineM) {
                  const ply = (r.no-1)*2 + ((meta?.playerSide||'w')==='w'?2:1);
                  console.log('[MovesTab] Engine move clicked: ply=', ply, 'engineM=', engineM.san);
                  jumpTo(ply);
                }
              }} sx={{ flex: 1, cursor: engineM ? 'pointer':'default', minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.25, transition: 'all 0.15s ease', '&:active': { transform: engineM ? 'scale(0.95)' : 'none' } }}>
                {engineM ? (
                  <>
                    <Dot color={engineDot} size={4} />
                    <Typography variant="caption" sx={{ fontFamily:'monospace', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 'inherit' }}>{engineIcon}</span>{engineM.san}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.73rem' }}>–</Typography>
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
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>{side}</Typography>
        <Stack direction="row" spacing={0.25} alignItems="flex-start" sx={{ flexWrap:'wrap', gap: 0.2 }}>
          {order.map((k) => data[k] ? (
            <Box key={k} sx={{ display:'flex', alignItems:'center', gap: 0.15, bgcolor: 'action.hover', px: 0.4, py: 0.15, borderRadius: 0.4, minWidth: 'auto' }}>
              <Dot color={clsColor[k]} size={4} />
              <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 500, whiteSpace: 'nowrap' }}>{k} <strong>{data[k]}</strong></Typography>
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
        <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Moves</Typography>
      </Box>

      {/* Two column layout: Moves table (left) and Classifications (right) */}
      <Grid display="flex" gap={1} width="100%" sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Moves table - takes more space */}
        <Box sx={{ flex: 1.3, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 0.5, px: 0.5, flexShrink: 0 }}>
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, fontSize: '0.65rem', color: 'text.secondary' }}>You</Typography>
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, fontSize: '0.65rem', color: 'text.secondary' }}>Stockfish</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Table />
          </Box>
        </Box>

        {/* Right: Classifications */}
        <Box sx={{ flex: 0.7, display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0, overflow: 'auto', minWidth: 160 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0 }}>Classification</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, overflow: 'auto', flex: 1, minHeight: 0 }}>
            <SummaryRow side={labels.player} data={summary.player || {}} />
            <Box sx={{ my: 0.2, borderTop: 1, borderColor: 'divider' }} />
            <SummaryRow side={labels.engine} data={summary.engine || {}} />
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
