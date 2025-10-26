import { Box, Typography } from "@mui/material";
const Grid: any = Box;
import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { Chess } from "chess.js";
import { boardAtom, gameAtom } from "@/src/sections/analysis/states";
import { getGameFromPgn } from "@/src/lib/chess";

export default function LoadGame() {
  const [game, setGame] = useAtom(gameAtom);
  const [board, setBoard] = useAtom(boardAtom);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Track the moves history of the last loaded game to detect actual game changes
  const lastGameMovesRef = useRef<string>("");

  useEffect(() => {
    // Only reset board when the actual game content changes (detected by comparing move history)
    const currentGameMoves = game.history().join(',');

    // If moves haven't changed since last loaded game, do nothing
    if (currentGameMoves === lastGameMovesRef.current && lastGameMovesRef.current !== "") {
      return;
    }

    // Avoid clobbering user's current navigation: if the user has already moved the analysis board
    // (e.g., clicked a move in the Moves list) then don't reset the board even if a late game load happens.
    if (board.history().length > 0 && lastGameMovesRef.current !== "") {
      // Still update the ref so subsequent identical loads are ignored
      console.log('[LoadGame] Game moves changed but board already navigated by user; skip resetting board. Current:', currentGameMoves.substring(0, 20));
      lastGameMovesRef.current = currentGameMoves;
      return;
    }

    console.log('[LoadGame] Game moves changed, resetting board. Previous:', lastGameMovesRef.current.substring(0, 20), 'Current:', currentGameMoves.substring(0, 20));
    lastGameMovesRef.current = currentGameMoves;

    // When a new game is loaded, reset the analysis board to that game's starting position.
    // If the PGN contains a FEN header (custom starting position), honor it; otherwise start from the default.
    try {
      const headers = (game as any)?.getHeaders ? (game as any).getHeaders() : {};
      const startFen: string | undefined = headers?.FEN;
      const NextCtor: any = (board as any)?.constructor ?? (Chess as any);
      const nextBoard = startFen ? new NextCtor(startFen) : new NextCtor();
      console.log('[LoadGame] Setting board to starting position, FEN=', startFen ?? 'default');
      setBoard(nextBoard);
    } catch {
      // Fallback to a fresh default board to avoid breaking the UI
      const NextCtor: any = (board as any)?.constructor ?? (Chess as any);
      console.log('[LoadGame] Error in effect, setting board to default');
      setBoard(new NextCtor());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try { setGame(getGameFromPgn(text)); } catch {}
  };

  return (
    <Grid display="flex" justifyContent="center" alignItems="center" width="100%">
      <input type="file" accept=".pgn,text/plain" hidden ref={fileInputRef} onChange={onChange} />
      <Typography variant="body2" sx={{ cursor:'pointer', textDecoration:'underline', textTransform:'uppercase', fontWeight:600 }} onClick={()=> fileInputRef.current?.click()}>Load Another Game</Typography>
    </Grid>
  );
}
