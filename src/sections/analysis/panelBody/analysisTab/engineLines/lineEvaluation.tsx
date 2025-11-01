import { LineEval } from "@/src/types/eval";
import { Box, Stack, Typography, Tooltip, IconButton } from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { boardAtom } from "@/src/sections/analysis/states";
import { moveLineUciToSan } from "@/src/lib/chess";
import { useChessActions } from "@/src/hooks/useChessActions";

export default function LineEvaluation({ line }: { line: LineEval }) {
  const board = useAtomValue(boardAtom);
  const { reset, addMoves } = useChessActions(boardAtom);
  // Convert PV (UCI) -> SAN sequence starting from current position FEN
  const toSan = moveLineUciToSan(board.fen());
  const sanSeq = (line.pv || []).map((uci) => toSan(uci));

  // Decorate SAN with piece icon (white/black alternating from side-to-move)
  const sideToMove = board.turn(); // 'w' or 'b'
  const ICONS = {
    w: { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔' },
    b: { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' },
  } as const;
  const withIcons = sanSeq.map((san, i) => {
    const color = (sideToMove === 'w') ? (i % 2 === 0 ? 'w' : 'b') : (i % 2 === 0 ? 'b' : 'w');
    let piece: 'P'|'N'|'B'|'R'|'Q'|'K' = 'P';
    if (san?.startsWith('O-O')) piece = 'K';
    else if (san && 'KQRBN'.includes(san[0])) piece = san[0] as any;
    const icon = ICONS[color][piece];
    return `${icon}${san}`;
  });

  const pvSan = withIcons.join(' ');
  const label = line.mate ? `M${Math.abs(line.mate)}` : typeof line.cp === 'number' ? (line.cp/100).toFixed(2) : '—';
  // Click to preview this PV on the analysis board (plays first N moves from current board position)
  const playPreview = () => {
    if (!sanSeq.length) return;
    // Reset board to its current FEN to ensure we apply SAN on a clean state anchored to this position
    // Do not touch headers when previewing
    reset({ fen: board.fen(), noHeaders: true });
    // Limit preview length to keep it readable; adjust as needed
    const MAX_PREVIEW = 10;
    addMoves(sanSeq.slice(0, MAX_PREVIEW));
  };

  // Play only the first move of this PV on top of current board position
  const playFirst = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!sanSeq.length) return;
    addMoves([sanSeq[0]]);
  };
  return (
    <Stack
      spacing={0.5}
      onClick={playPreview}
      sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: sanSeq.length ? 'pointer' : 'default' }}
      title={sanSeq.length ? '点击预演这条线路（前10步）' : undefined}
    >
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 1 }}>
        <Typography variant="body2">PV#{line.multiPv}</Typography>
        <Box sx={{ display:'flex', alignItems:'center', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Depth {line.depth} · {label}</Typography>
          {sanSeq.length > 0 && (
            <>
              <Tooltip title="只下一步 (PV 首步)">
                <IconButton size="small" onClick={playFirst} sx={{ ml: 0.5 }}>
                  <Icon icon="ri:arrow-right-s-line" />
                </IconButton>
              </Tooltip>
              <Tooltip title="预演多步 (前10步)">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); playPreview(); }}>
                  <Icon icon="ri:play-line" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
      <Box sx={{
        overflow: 'auto',
        whiteSpace: 'nowrap',
        '&::-webkit-scrollbar': {
          height: '6px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'action.disabled',
          borderRadius: '3px',
          '&:hover': {
            bgcolor: 'action.active',
          }
        }
      }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', display: 'inline-block' }} title={pvSan}>
          {pvSan || '...'}
        </Typography>
      </Box>
    </Stack>
  );
}
