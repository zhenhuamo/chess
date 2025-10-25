import { LineEval } from "@/src/types/eval";
import { Box, Stack, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom } from "@/src/sections/analysis/states";
import { moveLineUciToSan } from "@/src/lib/chess";

export default function LineEvaluation({ line }: { line: LineEval }) {
  const board = useAtomValue(boardAtom);
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
  return (
    <Stack spacing={0.5} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Typography variant="body2">PV#{line.multiPv}</Typography>
        <Typography variant="caption" color="text.secondary">Depth {line.depth} · {label}</Typography>
      </Box>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }} noWrap title={pvSan}>{pvSan || '...'}</Typography>
    </Stack>
  );
}
