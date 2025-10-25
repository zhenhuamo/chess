import { Box } from "@mui/material";
import { PrimitiveAtom, useAtomValue } from "jotai";
import { CurrentPosition } from "@/src/types/eval";
import { Color } from "@/src/types/enums";
import { getEvaluationBarValue } from "@/src/lib/chess";

export default function EvaluationBar({
  height,
  boardOrientation,
  currentPositionAtom,
}: {
  height: number;
  boardOrientation: Color;
  currentPositionAtom: PrimitiveAtom<CurrentPosition>;
}) {
  const position = useAtomValue(currentPositionAtom);

  const value = position.eval
    ? getEvaluationBarValue(position.eval)
    : { whiteBarPercentage: 50, label: "0.0" };

  const label = boardOrientation === Color.White ? value.label : value.label;
  const percentage =
    boardOrientation === Color.White
      ? value.whiteBarPercentage
      : 100 - value.whiteBarPercentage;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      sx={{ width: 30, height, position: "relative" }}
    >
      <Box
        sx={{
          height: "100%",
          width: "30%",
          borderRadius: 5,
          background: "linear-gradient(to bottom, white, black)",
          position: "absolute",
          top: 0,
          left: 5,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: `${percentage}%`,
            background: "#06b6d4",
          }}
        />
      </Box>
      <Box sx={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: 12 }}>
        {label}
      </Box>
    </Box>
  );
}

