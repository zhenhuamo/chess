import { Box, Stack, Typography } from "@mui/material";
const Grid: any = Box;

export default function PlayersMetric({
  title,
  whiteValue,
  blackValue,
  inline = false,
}: {
  title: string;
  whiteValue: string | number;
  blackValue: string | number;
  inline?: boolean;
}) {
  if (inline) {
    // Single-line display: "Accuracy  W 77.8% · B 92.3%"
    return (
      <Grid display="flex" alignItems="baseline" width="100%">
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          <Typography variant="body2">W {whiteValue} · B {blackValue}</Typography>
        </Stack>
      </Grid>
    );
  }
  // Default: title stacked above values
  return (
    <Grid display="flex" justifyContent="center" alignItems="center" width="100%">
      <Stack alignItems="center" spacing={0.5}>
        <Typography variant="caption" color="text.secondary">{title}</Typography>
        <Typography variant="body2">W {whiteValue} · B {blackValue}</Typography>
      </Stack>
    </Grid>
  );
}
