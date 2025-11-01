import { Icon } from "@iconify/react";
import { Box, Typography, Button } from "@mui/material";
const Grid: any = Box;
import GamePanel from "./gamePanel";
import AnalyzeButton from "./analyzeButton";
import LinearProgressBar from "@/src/components/LinearProgressBar";
import { useAtomValue } from "jotai";
import { evaluationProgressAtom, gameAtom } from "@/src/sections/analysis/states";

export default function PanelHeader({ onLoadGame }: { onLoadGame?: () => void }) {
  const evaluationProgress = useAtomValue(evaluationProgressAtom);
  const game = useAtomValue(gameAtom);
  const hasMoves = game.history().length > 0;

  return (
    <Grid display="flex" flexDirection="column" alignItems="center" width="100%">
      <Grid display="flex" justifyContent="center" alignItems="center" columnGap={0.5} width="100%">
        <Icon icon="streamline:clipboard-check" height={18} />
        <Typography variant="subtitle1" align="center">Game Analysis</Typography>
      </Grid>
      <Grid display="flex" justifyContent="center" alignItems="center" columnGap={8} width="100%" flexWrap="wrap">
        {hasMoves ? (
          <>
            <GamePanel />
            <AnalyzeButton />
            {evaluationProgress > 0 && <LinearProgressBar value={evaluationProgress} label="Analyzing..." />}
          </>
        ) : (
          <Button variant="contained" onClick={onLoadGame} size="large">
            Load Game to Analyze
          </Button>
        )}
      </Grid>
    </Grid>
  );
}
