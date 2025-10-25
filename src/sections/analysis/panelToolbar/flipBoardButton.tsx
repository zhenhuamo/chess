import { Icon } from "@iconify/react";
import { Box, IconButton, Tooltip } from "@mui/material";
const Grid: any = Box;
import { useAtom } from "jotai";
import { boardOrientationAtom } from "@/src/sections/analysis/states";

export default function FlipBoardButton() {
  const [boardOrientation, setBoardOrientation] = useAtom(boardOrientationAtom);
  return (
    <Tooltip title="Flip board">
      <Grid>
        <IconButton onClick={() => setBoardOrientation(!boardOrientation)} sx={{ paddingX: 1.2, paddingY: 0.5 }}>
          <Icon icon="ri:arrow-up-down-line" />
        </IconButton>
      </Grid>
    </Tooltip>
  );
}
