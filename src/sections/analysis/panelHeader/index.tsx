import { Icon } from "@iconify/react";
import { Box, Typography } from "@mui/material";
const Grid: any = Box;
import GamePanel from "./gamePanel";
import AnalyzeButton from "./analyzeButton";
import LinearProgressBar from "@/src/components/LinearProgressBar";
import { useAtomValue } from "jotai";
import { evaluationProgressAtom } from "@/src/sections/analysis/states";

export default function PanelHeader() {
  const evaluationProgress = useAtomValue(evaluationProgressAtom);
  return (
    <Grid display="flex" flexDirection="column" alignItems="center" width="100%">
      <Grid display="flex" justifyContent="center" alignItems="center" columnGap={0.5} width="100%">
        <Icon icon="streamline:clipboard-check" height={18} />
        <Typography variant="subtitle1" align="center">Game Analysis</Typography>
      </Grid>
      <Grid display="flex" justifyContent="center" alignItems="center" columnGap={8} width="100%" flexWrap="wrap">
        <GamePanel />
        <AnalyzeButton />
        {evaluationProgress > 0 && <LinearProgressBar value={evaluationProgress} label="Analyzing..." />}
      </Grid>
    </Grid>
  );
}
