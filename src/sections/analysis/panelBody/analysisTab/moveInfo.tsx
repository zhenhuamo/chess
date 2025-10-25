import { Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { currentPositionAtom } from "@/src/sections/analysis/states";
import { MoveClassification } from "@/src/types/enums";

export default function MoveInfo() {
  const position = useAtomValue(currentPositionAtom);
  const moveClassification = position.eval?.moveClassification;
  if (!moveClassification) return null;
  const label = (() => {
    switch (moveClassification) {
      case MoveClassification.Best: return 'Best';
      case MoveClassification.Inaccuracy: return 'Inaccuracy';
      case MoveClassification.Mistake: return 'Mistake';
      case MoveClassification.Blunder: return 'Blunder';
      case MoveClassification.Perfect: return 'Perfect';
      case MoveClassification.Splendid: return 'Splendid';
      case MoveClassification.Forced: return 'Forced';
      case MoveClassification.Opening: return 'Opening';
      case MoveClassification.Excellent: return 'Excellent';
      case MoveClassification.Okay: return 'Okay';
      default: return String(moveClassification);
    }
  })();
  return (
    <Typography variant="body2">Move quality: {label}</Typography>
  );
}
