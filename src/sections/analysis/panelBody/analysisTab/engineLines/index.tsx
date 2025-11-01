import { Box, Stack, Typography } from "@mui/material";
type GridProps = any;
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { boardAtom, currentPositionAtom, engineMultiPvAtom } from "@/src/sections/analysis/states";
import LineEvaluation from "./lineEvaluation";
import type { LineEval } from "@/src/types/eval";
import { useEffect, useMemo } from "react";
import { useChessActions } from "@/src/hooks/useChessActions";
import { moveLineUciToSan } from "@/src/lib/chess";

export default function EngineLines(props: GridProps) {
  const linesNumber = useAtomValue(engineMultiPvAtom);
  const position = useAtomValue(currentPositionAtom);
  const board = useAtomValue(boardAtom);
  const { addMoves } = useChessActions(boardAtom);
  const linesSkeleton: LineEval[] = Array.from({ length: linesNumber }).map(
    (_, i) => ({ pv: [], multiPv: i + 1, depth: 0 })
  );
  const engineLines = position?.eval?.lines?.length
    ? position.eval.lines
    : linesSkeleton;

  // Keyboard shortcuts: 1/2/3 to play the first move of PV#1/#2/#3 on the analysis board
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (!['1','2','3'].includes(key)) return;
      const idx = Number(key);
      const line = (engineLines.find((l) => l.multiPv === idx) || engineLines[idx - 1]);
      if (!line || !line.pv?.length) return;
      try {
        const toSan = moveLineUciToSan(board.fen());
        const firstSan = toSan(line.pv[0]);
        addMoves([firstSan]);
        e.preventDefault();
      } catch {}
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [engineLines, board, addMoves]);

  return (
    <Grid display="flex" alignItems="stretch" justifyContent="center" width="100%" {...props}>
      <Stack spacing={0.5} sx={{ width: '100%' }}>
        <Typography variant="caption" color="text.secondary" title="提示：点击一条线可预演前10步；按 1/2/3 可下一步对应的 PV 首步">Engine Lines</Typography>
        <Box sx={{
          height: 260,
          minHeight: 200,
          maxHeight: '40vh',
          resize: 'vertical',
          overflow: 'auto',
          pr: 0.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          <Stack spacing={1} sx={{ width: '100%' }}>
            {engineLines.map((line) => (
              <LineEvaluation key={line.multiPv} line={line} />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Grid>
  );
}
