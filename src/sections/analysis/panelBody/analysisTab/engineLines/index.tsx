import { Box, Stack, Typography } from "@mui/material";
type GridProps = any;
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { currentPositionAtom, engineMultiPvAtom } from "@/src/sections/analysis/states";
import LineEvaluation from "./lineEvaluation";
import type { LineEval } from "@/src/types/eval";

export default function EngineLines(props: GridProps) {
  const linesNumber = useAtomValue(engineMultiPvAtom);
  const position = useAtomValue(currentPositionAtom);
  const linesSkeleton: LineEval[] = Array.from({ length: linesNumber }).map(
    (_, i) => ({ pv: [], multiPv: i + 1, depth: 0 })
  );
  const engineLines = position?.eval?.lines?.length
    ? position.eval.lines
    : linesSkeleton;

  return (
    <Grid display="flex" alignItems="center" justifyContent="center" width="100%" {...props}>
      <Stack spacing={1} sx={{ width: '100%' }}>
        <Typography variant="caption" color="text.secondary">Engine Lines</Typography>
        {engineLines.map((line) => (
          <LineEvaluation key={line.multiPv} line={line} />
        ))}
      </Stack>
    </Grid>
  );
}
