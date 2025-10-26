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
    <Grid display="flex" alignItems="stretch" justifyContent="center" width="100%" {...props}>
      <Stack spacing={0.5} sx={{ width: '100%' }}>
        <Typography variant="caption" color="text.secondary">Engine Lines</Typography>
        <Box sx={{
          // default更高，直接能看到 PV#1~#3；可向上拖拽扩展
          height: 280,
          minHeight: 180,
          maxHeight: '60vh',
          resize: 'vertical',
          overflow: 'auto',
          pr: 0.5,
          borderRadius: 1,
          border: '1px dashed',
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
