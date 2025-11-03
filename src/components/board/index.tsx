import { Box } from "@mui/material";
const Grid: any = Box;
import { Chessboard } from "react-chessboard";
import { PrimitiveAtom, atom, useAtomValue, useSetAtom, useAtom } from "jotai";
import { useChessActions } from "@/src/hooks/useChessActions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, MoveClassification } from "@/src/types/enums";
import { Chess } from "chess.js";
import { getSquareRenderer } from "./squareRenderer";
import { CurrentPosition } from "@/src/types/eval";
import EvaluationBar from "./evaluationBar";
import { CLASSIFICATION_COLORS, PIECE_SETS } from "@/src/constants";
import { Player } from "@/src/types/game";
import PlayerHeader from "./playerHeader";
import { boardHueAtom, pieceSetAtom } from "./states";
import { retryStateAtom } from "@/src/sections/analysis/states";
import tinycolor from "tinycolor2";

export interface Props {
  id: string;
  canPlay?: Color | boolean;
  gameAtom: PrimitiveAtom<Chess>;
  boardSize?: number;
  whitePlayer: Player;
  blackPlayer: Player;
  boardOrientation?: Color;
  currentPositionAtom?: PrimitiveAtom<CurrentPosition>;
  showBestMoveArrow?: boolean;
  showPlayerMoveIconAtom?: PrimitiveAtom<boolean>;
  showEvaluationBar?: boolean;
}

export default function Board({ id: boardId, canPlay, gameAtom, boardSize, whitePlayer, blackPlayer, boardOrientation = Color.White, currentPositionAtom = atom({}), showBestMoveArrow = false, showPlayerMoveIconAtom, showEvaluationBar = false, }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useAtomValue(gameAtom);
  console.log('[Board] game updated, history length=', game.history().length, 'FEN=', game.fen()?.substring(0, 20));
  const { playMove } = useChessActions(gameAtom);
  const clickedSquaresAtom = useMemo(() => atom<string[]>([]), []);
  const setClickedSquares = useSetAtom(clickedSquaresAtom);
  const playableSquaresAtom = useMemo(() => atom<string[]>([]), []);
  const setPlayableSquares = useSetAtom(playableSquaresAtom);
  const position = useAtomValue(currentPositionAtom);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [moveClickFrom, setMoveClickFrom] = useState<string | null>(null);
  const [moveClickTo, setMoveClickTo] = useState<string | null>(null);
  const pieceSet = useAtomValue(pieceSetAtom);
  const boardHue = useAtomValue(boardHueAtom);
  const [retryState, setRetryState] = useAtom(retryStateAtom);

  // Only the piece placement part of the FEN is relevant for rendering pieces
  const gameFen = game.fen();
  const positionPlacement = useMemo(() => (gameFen || '').split(' ')[0] || '', [gameFen]);
  useEffect(() => {
    console.log('[Board] FEN changed:', gameFen);
    setClickedSquares([]);
  }, [gameFen, setClickedSquares]);

  const isPiecePlayable = useCallback(({ piece }: { piece: string }): boolean => {
    if (game.isGameOver() || !canPlay) return false;
    if (canPlay === true || canPlay === piece[0]) return true;
    return false;
  }, [canPlay, game]);

  // react-chessboard v5 drop handler adapter
  const onPieceDrop = useCallback((args: { pieceType: string; sourceSquare: string; targetSquare: string | null; }): boolean => {
    const { pieceType, sourceSquare, targetSquare } = args;
    if (!targetSquare) return false;
    if (!isPiecePlayable({ piece: pieceType })) return false;
    // Retry mode: block non-candidate drops
    if (retryState?.active) {
      const base = `${sourceSquare}${targetSquare}`;
      const allowed = new Set(retryState.allowedUci || []);
      if (allowed.size > 0) {
        let ok = false;
        for (const u of allowed) { if (u.startsWith(base)) { ok = true; break; } }
        if (!ok) {
          setRetryState((prev) => {
            const left = Math.max(0, (prev.attemptsLeft ?? 0) - 1);
            return { ...prev, attemptsLeft: left, hintStage: (prev.hintStage ?? 0) + 1, message: left > 0 ? `Not a candidate. Attempts left: ${left}` : `Attempts exhausted. Revealing the correct move.`, success: false };
          });
          return false;
        }
      }
    }
    const result = playMove({ from: sourceSquare, to: targetSquare, promotion: pieceType[1]?.toLowerCase() ?? "q" });
    return !!result;
  }, [isPiecePlayable, playMove, retryState, setRetryState]);

  const resetMoveClick = useCallback((square?: string | null) => {
    setMoveClickFrom(square ?? null);
    setMoveClickTo(null);
    setShowPromotionDialog(false);
    if (square) {
      const moves = game.moves({ square: square as any, verbose: true });
      setPlayableSquares(moves.map((m) => m.to));
    } else {
      setPlayableSquares([]);
    }
  }, [setMoveClickFrom, setMoveClickTo, setPlayableSquares, game]);

  const handleSquareLeftClick = useCallback((square: string, piece?: string) => {
    setClickedSquares([]);
    if (!moveClickFrom) {
      if (piece && !isPiecePlayable({ piece })) return;
      resetMoveClick(square);
      return;
    }
    const validMoves = game.moves({ square: moveClickFrom as any, verbose: true });
    const move = validMoves.find((m) => m.to === square);
    if (!move) {
      resetMoveClick(square);
      return;
    }
    setMoveClickTo(square);
    if (move.piece === "p" && ((move.color === "w" && square[1] === "8") || (move.color === "b" && square[1] === "1"))) {
      setShowPromotionDialog(true);
      return;
    }
    // Retry mode: only allow candidate moves
    if (retryState?.active) {
      try {
        const attemptedUci = `${move.from}${square}${move.promotion || ''}`;
        const allowed = new Set(retryState.allowedUci || []);
        if (allowed.size > 0 && !allowed.has(attemptedUci)) {
          setRetryState((prev) => {
            const left = Math.max(0, (prev.attemptsLeft ?? 0) - 1);
            return { ...prev, attemptsLeft: left, hintStage: (prev.hintStage ?? 0) + 1, message: left > 0 ? `Not a candidate. Attempts left: ${left}` : `Attempts exhausted. Revealing the correct move.`, success: false };
          });
          return; // block move
        }
      } catch {}
    }
    const result = playMove({ from: moveClickFrom, to: square });
    resetMoveClick(result ? undefined : square);
    if (retryState?.active) {
      setRetryState((prev) => ({ ...prev, success: true, message: 'Good move! This matches the engine candidate.' }));
    }
  }, [game, isPiecePlayable, moveClickFrom, playMove, resetMoveClick, setClickedSquares]);

  const handleSquareRightClick = useCallback((square: string) => {
    setClickedSquares((prev) => prev.includes(square) ? prev.filter((s) => s !== square) : [...prev, square]);
  }, [setClickedSquares]);

  // v5 exposes onPieceDrag instead of separate begin/end
  const handlePieceDrag = useCallback(({ square }: { square: string | null }) => {
    if (square) resetMoveClick(square); else resetMoveClick();
  }, [resetMoveClick]);

  const onPromotionPieceSelect = useCallback((piece?: any, from?: string, to?: string) => {
    if (!piece) return false;
    const promotionPiece = piece[1]?.toLowerCase() ?? "q";
    if (moveClickFrom && moveClickTo) {
      const result = playMove({ from: moveClickFrom, to: moveClickTo, promotion: promotionPiece });
      resetMoveClick();
      return !!result;
    }
    if (from && to) {
      const result = playMove({ from, to, promotion: promotionPiece });
      resetMoveClick();
      return !!result;
    }
    resetMoveClick(moveClickFrom);
    return false;
  }, [moveClickFrom, moveClickTo, playMove, resetMoveClick]);

  const customArrows: Array<{ startSquare: string; endSquare: string; color: string }> = useMemo(() => {
    const bestMove = position?.lastEval?.bestMove;
    const moveClassification = position?.eval?.moveClassification as MoveClassification | undefined;
    if (bestMove && showBestMoveArrow && moveClassification && ![MoveClassification.Best, MoveClassification.Opening, MoveClassification.Forced, MoveClassification.Perfect].includes(moveClassification)) {
      return [{
        startSquare: bestMove.slice(0, 2),
        endSquare: bestMove.slice(2, 4),
        color: tinycolor(CLASSIFICATION_COLORS[MoveClassification.Best]).spin(-boardHue).toHexString(),
      }];
    }
    return [];
  }, [position, showBestMoveArrow, boardHue]);

  const SquareRenderer: any = useMemo(() => {
    return getSquareRenderer({ currentPositionAtom: currentPositionAtom, clickedSquaresAtom, playableSquaresAtom, showPlayerMoveIconAtom, });
  }, [ currentPositionAtom, clickedSquaresAtom, playableSquaresAtom, showPlayerMoveIconAtom ]);

  const customPieces = useMemo(() => PIECE_CODES.reduce<any>((acc, piece) => {
    acc[piece] = () => (
      <img src={`/piece/${pieceSet}/${piece}.svg`} alt={piece} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
    );
    return acc;
  }, {}), [pieceSet]);

  const customBoardStyle = useMemo(() => {
    const commonBoardStyle = { borderRadius: "5px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)" } as any;
    if (boardHue) return { ...commonBoardStyle, filter: `hue-rotate(${boardHue}deg)` };
    return commonBoardStyle;
  }, [boardHue]);

  return (
    <Grid display="flex" justifyContent="center" alignItems="center" flexWrap="nowrap" width={boardSize}>
      {showEvaluationBar && (
        <EvaluationBar height={boardRef?.current?.offsetHeight || boardSize || 400} boardOrientation={boardOrientation} currentPositionAtom={currentPositionAtom} />
      )}
      <Grid display="flex" flexDirection="column" rowGap={1.5} justifyContent="center" alignItems="center" pl={showEvaluationBar ? 2 : 0} flex={1}>
        <PlayerHeader color={boardOrientation === Color.White ? Color.Black : Color.White} gameAtom={gameAtom} player={boardOrientation === Color.White ? blackPlayer : whitePlayer} />
        <Grid display="flex" justifyContent="center" alignItems="center" ref={boardRef} width="100%">
          <AnyChessboard
            key={`${boardId}-${positionPlacement}`}
            options={{
              id: boardId,
              position: positionPlacement,
              boardOrientation: boardOrientation === Color.White ? 'white' : 'black',
              boardStyle: customBoardStyle,
              animationDurationInMs: 200,
              pieces: customPieces,
              squareRenderer: (({ piece, square, children }: { piece: { pieceType: string } | null; square: string; children?: any; }) => (
                (SquareRenderer as any)({ square, children })
              )) as any,
              arrows: customArrows as any,
              canDragPiece: ({ isSparePiece, piece }: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null; }) => !isSparePiece && isPiecePlayable({ piece: piece.pieceType }),
              onPieceDrop: ({ piece, sourceSquare, targetSquare }: { piece: { pieceType: string; position: string }; sourceSquare: string; targetSquare: string | null; }) => onPieceDrop({ pieceType: piece.pieceType, sourceSquare, targetSquare }),
              onSquareClick: ({ piece, square }: { piece: { pieceType: string } | null; square: string; }) => handleSquareLeftClick(square, piece?.pieceType),
              onSquareRightClick: ({ square }: { square: string; }) => handleSquareRightClick(square),
              onPieceDrag: ({ square }: { square: string | null }) => handlePieceDrag({ square }),
            }}
          />
        </Grid>
        <PlayerHeader color={boardOrientation} gameAtom={gameAtom} player={boardOrientation === Color.White ? whitePlayer : blackPlayer} />
      </Grid>
    </Grid>
  );
}

export const PIECE_CODES = [ "wP", "wB", "wN", "wR", "wQ", "wK", "bP", "bB", "bN", "bR", "bQ", "bK" ] as const;
  const AnyChessboard: any = Chessboard as any;
