import { Box, Stack, Typography } from "@mui/material";
const Grid: any = Box;

export default function PlayersMetric({
  title,
  whiteValue,
  blackValue,
}: {
  title: string;
  whiteValue: string | number;
  blackValue: string | number;
}) {
  return (
    <Grid display="flex" justifyContent="center" alignItems="center" width="100%">
      <Stack alignItems="center" spacing={0.5}>
        <Typography variant="caption" color="text.secondary">{title}</Typography>
        <Typography variant="body2">W {whiteValue} · B {blackValue}</Typography>
      </Stack>
    </Grid>
  );
}
