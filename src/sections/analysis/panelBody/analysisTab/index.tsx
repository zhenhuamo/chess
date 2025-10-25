import { Box, Stack, Typography } from "@mui/material";
type GridProps = any;
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom } from "@/src/sections/analysis/states";
import PlayersMetric from "./playersMetric";
import MoveInfo from "./moveInfo";
import Opening from "./opening";
import EngineLines from "./engineLines";

export default function AnalysisTab(props: GridProps) {
  const gameEval = useAtomValue(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);

  const boardHistory = board.history();
  const gameHistory = game.history();

  const isGameOver =
    boardHistory.length > 0 &&
    (board.isCheckmate() || board.isDraw() || boardHistory.join() === gameHistory.join());

  return (
    <Grid display="flex" width="100%" flexDirection="column" sx={{ gap: 1.5, ...(props.sx || {}), ...(props.hidden ? { display: 'none' } : {}) }}>
      <Stack justifyContent="flex-start" alignItems="stretch" spacing={1}>
        {gameEval && (
          <PlayersMetric title="Accuracy" whiteValue={`${gameEval.accuracy.white.toFixed(1)} %`} blackValue={`${gameEval.accuracy.black.toFixed(1)} %`} />
        )}
        {gameEval?.estimatedElo && (
          <PlayersMetric title="Game Rating" whiteValue={Math.round(gameEval.estimatedElo.white)} blackValue={Math.round(gameEval.estimatedElo.black)} />
        )}
        <MoveInfo />
        <Opening />
        {isGameOver && (
          <Typography align="center" fontSize="0.85rem" noWrap sx={{ color: 'text.secondary' }}>
            Game is over
          </Typography>
        )}
      </Stack>
      {gameEval && (
        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
          <EngineLines />
        </Box>
      )}
    </Grid>
  );
}
