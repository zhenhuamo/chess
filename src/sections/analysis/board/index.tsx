import { useAtomValue } from "jotai";
import { boardAtom, boardOrientationAtom, currentPositionAtom, gameAtom, showBestMoveArrowAtom } from "@/src/sections/analysis/states";
import { useMemo } from "react";
import { useScreenSize } from "@/src/hooks/useScreenSize";
import { Color } from "@/src/types/enums";
import Board from "@/src/components/board";
import { usePlayersData } from "@/src/hooks/usePlayersData";

export default function BoardContainer({ reservedWidth = 900 }: { reservedWidth?: number } = {}) {
  const screenSize = useScreenSize();
  const boardOrientation = useAtomValue(boardOrientationAtom);
  const showBestMoveArrow = useAtomValue(showBestMoveArrowAtom);
  const { white, black } = usePlayersData(gameAtom);

  const boardSize = useMemo(() => {
    const width = screenSize.width;
    const height = screenSize.height;
    if (typeof window !== 'undefined' && window.innerWidth < 1200) {
      return Math.min(width - 15, height - 150);
    }
    // Reserve dynamic width for the right analysis panel
    return Math.min(width - reservedWidth, height * 0.92);
  }, [screenSize, reservedWidth]);

  return (
    <Board
      id="AnalysisBoard"
      boardSize={boardSize}
      canPlay={true}
      gameAtom={boardAtom}
      whitePlayer={white}
      blackPlayer={black}
      boardOrientation={boardOrientation ? Color.White : Color.Black}
      currentPositionAtom={currentPositionAtom}
      showBestMoveArrow={showBestMoveArrow}
      showEvaluationBar={true}
    />
  );
}
