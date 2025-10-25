import { Box, Stack, Typography } from "@mui/material";
const Grid: any = Box;
import { useAtomValue } from "jotai";
import { gameAtom } from "@/src/sections/analysis/states";

export default function GamePanel() {
  const game = useAtomValue(gameAtom);
  const headers = (game as any).getHeaders ? (game as any).getHeaders() : {};
  const white = headers.White || 'White'; const black = headers.Black || 'Black';
  const result = headers.Result || '*/-*'; const date = headers.Date || '';
  return (
    <Grid display="flex" justifyContent="center" alignItems="center" width="100%">
      <Stack spacing={0.5} alignItems="center">
        <Typography variant="body2">{white} vs {black}</Typography>
        <Typography variant="caption" color="text.secondary">{date} · Result {result}</Typography>
      </Stack>
    </Grid>
  );
}
