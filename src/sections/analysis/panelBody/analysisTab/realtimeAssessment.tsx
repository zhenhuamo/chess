"use client";
import { Box, Stack, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, currentPositionAtom } from "@/src/sections/analysis/states";
import { moveLineUciToSan } from "@/src/lib/chess";

// MoveClassification enum values are lowercase strings – keep keys lowercase
const colorMap: Record<string, string> = {
  splendid:'#22d3ee', perfect:'#38bdf8', excellent:'#22c55e', best:'#10b981',
  okay:'#84cc16', inaccuracy:'#eab308', mistake:'#f97316', blunder:'#ef4444',
  forced:'#94a3b8', opening:'#94a3b8'
};
const iconMap: Record<string, string> = {
  splendid:'splendid', perfect:'perfect', excellent:'excellent', best:'best',
  okay:'okay', inaccuracy:'inaccuracy', mistake:'mistake', blunder:'blunder',
  forced:'forced', opening:'opening'
};

export default function RealtimeAssessment() {
  const board = useAtomValue(boardAtom);
  const position = useAtomValue(currentPositionAtom);

  // Need a last move (SAN) and classification to render
  const hist = board.history({ verbose: true }) as any[];
  const ply = hist.length;
  const last = hist[ply - 1];
  const cls = position?.eval?.moveClassification as any;
  if (!last?.san || !cls) return null;

  // Best move comes from the evaluation of the previous position
  const bestUci = position?.lastEval?.bestMove as string | undefined;
  let bestSan: string | undefined = undefined;
  try {
    const prevFen = last?.before || undefined;
    if (bestUci && prevFen) bestSan = moveLineUciToSan(prevFen)(bestUci);
  } catch {}

  const key = String(cls).toLowerCase();
  const color = colorMap[key] || 'inherit';
  const icon = `/icons/${iconMap[key]||'best'}.png`;

  return (
    <Box sx={{ mt: 0.5, p: 1, borderRadius: 1.5, bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box component="img" src={icon} alt="cls" sx={{ width: 18, height: 18 }} />
        <Typography variant="body2" sx={{ color, fontWeight: 700 }}>{last.san} is {String(cls).toLowerCase()}</Typography>
      </Stack>
      {bestSan && (
        <Typography variant="body2" sx={{ color: '#16a34a', mt: 0.5 }}>The best move was {bestSan}</Typography>
      )}
    </Box>
  );
}
