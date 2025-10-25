import { ceilsNumber } from "@/lib/math";
import { LineEval, PositionEval } from "@/types/eval";

export const getPositionWinPercentage = (position: PositionEval): number => {
  // Be defensive: some positions may not have any computed lines yet
  const top = position?.lines?.[0];
  return getLineWinPercentage(top);
};

export const getLineWinPercentage = (line?: LineEval): number => {
  if (!line) return 50; // unknown → equal chances
  if (line.cp !== undefined) return getWinPercentageFromCp(line.cp);
  if (line.mate !== undefined) return getWinPercentageFromMate(line.mate);
  return 50;
};

const getWinPercentageFromMate = (mate: number): number => {
  return mate > 0 ? 100 : 0;
};

// Source: https://github.com/lichess-org/lila/blob/a320a93b68dabee862b8093b1b2acdfe132b9966/modules/analyse/src/main/WinPercent.scala#L27
const getWinPercentageFromCp = (cp: number): number => {
  const cpCeiled = ceilsNumber(cp, -1000, 1000);
  const MULTIPLIER = -0.00368208; // Source : https://github.com/lichess-org/lila/pull/11148
  const winChances = 2 / (1 + Math.exp(MULTIPLIER * cpCeiled)) - 1;
  return 50 + 50 * winChances;
};
