import { Icon } from "@iconify/react";
import { Box, IconButton, Tooltip } from "@mui/material";
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom } from "@/src/sections/analysis/states";
import { useChessActions } from "@/src/hooks/useChessActions";

export default function GoToLastPositionButton() {
  const board = useAtomValue(boardAtom);
  const game = useAtomValue(gameAtom);
  const { addMoves } = useChessActions(boardAtom);
  const isButtonEnabled = board.history().length < game.history().length;
  return (
    <Tooltip title="Go to last position">
      <Grid>
        <IconButton
          onClick={() => {
            const moves = game.history().slice(board.history().length);
            addMoves(moves);
          }}
          disabled={!isButtonEnabled}
          sx={{ paddingX: 1.2, paddingY: 0.5 }}
        >
          <Icon icon="ri:skip-forward-line" />
        </IconButton>
      </Grid>
    </Tooltip>
  );
}
