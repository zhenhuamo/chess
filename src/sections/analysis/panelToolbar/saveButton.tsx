import { Box, IconButton, Tooltip } from "@mui/material";
const Grid: any = Box;
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { gameAtom, boardAtom } from "@/src/sections/analysis/states";
import { useChessActions } from "@/src/hooks/useChessActions";
import { useGameDatabase } from "@/src/hooks/useGameDatabase";

export default function SaveButton() {
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const { reset: resetBoard } = useChessActions(boardAtom);
  const { addGame } = useGameDatabase();
  const disabled = game.history().length === 0 && board.history().length === 0;

  return (
    <Tooltip title="Save game">
      <Grid>
        <IconButton
          disabled={disabled}
          onClick={async () => {
            const g = game.history().length ? game : board;
            const id = await addGame(g);
            resetBoard();
            console.info("Saved game id", id);
          }}
          sx={{ paddingX: 1.2, paddingY: 0.5 }}
        >
          <Icon icon="ri:save-3-line" />
        </IconButton>
      </Grid>
    </Tooltip>
  );
}
