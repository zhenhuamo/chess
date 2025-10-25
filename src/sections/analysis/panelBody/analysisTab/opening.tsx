import { Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { currentPositionAtom } from "@/src/sections/analysis/states";

export default function Opening() {
  const position = useAtomValue(currentPositionAtom);
  const opening = position?.eval?.opening || position.opening;
  if (!opening) return null;
  return (
    <Typography variant="body2" color="text.secondary">Opening: {opening}</Typography>
  );
}

