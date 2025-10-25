import { Icon } from "@iconify/react";
import { Box, Typography } from "@mui/material";
const Grid: any = Box;
import GamePanel from "./gamePanel";
import LoadGame from "./loadGame";
import AnalyzeButton from "./analyzeButton";
import LinearProgressBar from "@/src/components/LinearProgressBar";
import { useAtomValue } from "jotai";
import { evaluationProgressAtom } from "@/src/sections/analysis/states";

export default function PanelHeader() {
  const evaluationProgress = useAtomValue(evaluationProgressAtom);
  return (
    <Grid display="flex" flexDirection="column" alignItems="center" rowGap={2} width="100%">
      <Grid display="flex" justifyContent="center" alignItems="center" columnGap={1} width="100%">
        <Icon icon="streamline:clipboard-check" height={24} />
        <Typography variant="h5" align="center">Game Analysis</Typography>
      </Grid>
      <Grid display="flex" justifyContent="center" alignItems="center" rowGap={2} columnGap={12} width="100%" flexWrap="wrap">
        <GamePanel />
        <LoadGame />
        <AnalyzeButton />
        <LinearProgressBar value={evaluationProgress} label="Analyzing..." />
      </Grid>
    </Grid>
  );
}
