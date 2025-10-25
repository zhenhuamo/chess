import { LINEAR_PROGRESS_BAR_COLOR } from "@/src/constants";
import { Box, LinearProgress, LinearProgressProps, Typography, linearProgressClasses } from "@mui/material";
const Grid: any = Box;

const LinearProgressBar = (
  props: LinearProgressProps & { value: number; label: string }
) => {
  if (props.value === 0) return null;

  return (
    <Grid display="flex" alignItems="center" justifyContent="center" flexWrap="nowrap" width="90%" columnGap={2}>
      <Typography variant="caption" align="center">
        {props.label}
      </Typography>
      <Grid sx={{ width: "100%" }}>
        <LinearProgress
          variant="determinate"
          {...props}
          sx={(theme) => ({
            borderRadius: "5px",
            height: "5px",
            [`&.${linearProgressClasses.colorPrimary}`]: {
              backgroundColor:
                theme.palette.grey[theme.palette.mode === "light" ? 200 : 700],
            },
            [`& .${linearProgressClasses.bar}`]: {
              borderRadius: 5,
              backgroundColor: LINEAR_PROGRESS_BAR_COLOR,
            },
          })}
        />
      </Grid>
      <Grid>
        <Typography variant="body2" color="text.secondary">{`${Math.round(
          props.value
        )}%`}</Typography>
      </Grid>
    </Grid>
  );
};

export default LinearProgressBar;
