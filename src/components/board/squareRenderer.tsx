import { Box } from "@mui/material";
import { PrimitiveAtom, atom, useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { Color, MoveClassification } from "@/src/types/enums";
import { CurrentPosition } from "@/src/types/eval";
import { CLASSIFICATION_COLORS } from "@/src/constants";
import tinycolor from "tinycolor2";

export const getSquareRenderer = ({
  currentPositionAtom,
  clickedSquaresAtom,
  playableSquaresAtom,
  showPlayerMoveIconAtom,
}: {
  currentPositionAtom: PrimitiveAtom<CurrentPosition>;
  clickedSquaresAtom: PrimitiveAtom<string[]>;
  playableSquaresAtom: PrimitiveAtom<string[]>;
  showPlayerMoveIconAtom?: PrimitiveAtom<boolean>;
}) => {
  // Create a stable fallback atom once (do NOT create atoms inside render)
  const fallbackShowIconAtom = atom<boolean>(false);
  const resolvedShowIconAtom = showPlayerMoveIconAtom ?? fallbackShowIconAtom;
  // Return a real React component; hooks are called inside the component render,
  // not inside this factory function (avoids rules-of-hooks violations).
  return function SquareRenderer({ square, children, style, className }: any) {
    const clickedSquares = useAtomValue(clickedSquaresAtom);
    const playableSquares = useAtomValue(playableSquaresAtom);
    const showPlayerMoveIcon = useAtomValue(resolvedShowIconAtom);
    const position = useAtomValue(currentPositionAtom);

    const lastMoveSquares = useMemo(() => {
      const from = position?.lastMove?.from;
      const to = position?.lastMove?.to;
      return [from, to].filter(Boolean) as string[];
    }, [position]);

    const playerIconColor = useMemo(() => {
      const lastMoveColor = position?.lastMove?.color ?? Color.White;
      return lastMoveColor === Color.White ? "#ffffff" : "#000000";
    }, [position]);

    const moveIcon = useMemo(() => {
      const lastMove = position?.lastMove;
      if (!lastMove || !showPlayerMoveIcon) return null;
      return (
        <Box
          sx={{
            position: "absolute",
            width: 22,
            height: 22,
            right: 2,
            top: 2,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,.6)",
            backgroundColor: playerIconColor,
          }}
        />
      );
    }, [playerIconColor, position, showPlayerMoveIcon]);

    const hoverStyle = useCallback(
      (sq: string) => {
        const isLastMoveSquare = lastMoveSquares.includes(sq);
        const isClicked = clickedSquares.includes(sq);
        const isPlayable = playableSquares.includes(sq);

        const overlays: any[] = [];
        if (isLastMoveSquare) overlays.push({ background: "rgba(59,130,246,0.15)" });
        if (isClicked) overlays.push({ boxShadow: "inset 0 0 0 4px rgba(59,130,246,.7)" });
        if (isPlayable) overlays.push({ boxShadow: "inset 0 0 0 4px rgba(16,185,129,.7)" });

        const classification = position?.eval?.moveClassification as MoveClassification | undefined;
        const dest = position?.lastMove?.to;
        if (classification && dest === sq && ![MoveClassification.Best, MoveClassification.Forced, MoveClassification.Opening, MoveClassification.Perfect].includes(classification)) {
          const color = tinycolor(CLASSIFICATION_COLORS[classification]).toHexString();
          overlays.push({ background: tinycolor(color).setAlpha(0.25).toRgbString() });
        }
        return overlays.reduce((acc, cur) => Object.assign(acc, cur), {} as any);
      },
      [clickedSquares, playableSquares, lastMoveSquares, position]
    );

    const overlay = hoverStyle(square);
    // Classification badge icon for the last move destination
    const clsIcon = (() => {
      const cls = position?.eval?.moveClassification as MoveClassification | undefined;
      const dest = position?.lastMove?.to;
      if (!cls || dest !== square) return undefined;
      const map: Record<string, string> = {
        Splendid: 'splendid',
        Perfect: 'perfect',
        Excellent: 'excellent',
        Best: 'best',
        Okay: 'okay',
        Inaccuracy: 'inaccuracy',
        Mistake: 'mistake',
        Blunder: 'blunder',
        Forced: 'forced',
        Opening: 'opening',
      };
      const key = map[String(cls)] || 'best';
      return `/icons/${key}.png`;
    })();
    return (
      <Box sx={{ position: "relative", width: "100%", height: "100%", ...style }} className={className}>
        {children}
        {moveIcon}
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", ...overlay }} />
        {clsIcon && (
          <Box component="img" src={clsIcon} alt="cls" sx={{ position: 'absolute', right: 4, top: 4, width: 18, height: 18, pointerEvents: 'none' }} />
        )}
      </Box>
    );
  };
};
