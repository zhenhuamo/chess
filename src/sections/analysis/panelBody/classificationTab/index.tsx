import { Box, Typography } from "@mui/material";
type GridProps = any;
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { gameEvalAtom } from "@/src/sections/analysis/states";

export default function ClassificationTab(props: GridProps) {
  const gameEval = useAtomValue(gameEvalAtom);
  if (!gameEval) return null;
  const best = gameEval.positions.filter(p=> p.moveClassification === 'best').length;
  const blunders = gameEval.positions.filter(p=> p.moveClassification === 'blunder').length;
  return (
    <Grid display="flex" justifyContent="center" alignItems="center" {...props}>
      <Box>
        <Typography variant="body2">Best: {best} · Blunders: {blunders}</Typography>
      </Box>
    </Grid>
  );
}
