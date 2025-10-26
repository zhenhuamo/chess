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
  // Track the moves history of the last loaded game to detect actual game changes across renders
  // WARNING: In React strict/dev, effects can mount twice. We must not clobber a navigated board.
  const lastGameMovesRef = useRef<string>("");

  useEffect(() => {
    // Only reset board on an actual game change AND only if the user hasn't already navigated the board.
    // This avoids the bug where StrictMode remount makes the effect run again and clobbers a navigated board.
    const currentGameMoves = game.history().join(',');
    const isSameGame = lastGameMovesRef.current !== "" && currentGameMoves === lastGameMovesRef.current;
    if (isSameGame) return;

    // If board already has moves, do NOT reset it (user is navigating the analysis). Just record the game signature.
    if (board.history().length > 0) {
      console.log('[LoadGame] Detected game change but board already has moves; skip resetting. Moves=', board.history().length);
      lastGameMovesRef.current = currentGameMoves;
      return;
    }

    console.log('[LoadGame] Initializing board from loaded game. Current moves sig=', currentGameMoves.substring(0, 20));
    lastGameMovesRef.current = currentGameMoves;

    try {
      const headers = (game as any)?.getHeaders ? (game as any).getHeaders() : {};
      const startFen: string | undefined = headers?.FEN;
      const NextCtor: any = (board as any)?.constructor ?? (Chess as any);
      const nextBoard = startFen ? new NextCtor(startFen) : new NextCtor();
      setBoard(nextBoard);
    } catch {
      const NextCtor: any = (board as any)?.constructor ?? (Chess as any);
      setBoard(new NextCtor());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const g = getGameFromPgn(text);
      setGame(g);
      // Immediately put board to the starting position of the newly loaded game to ensure the UI syncs
      try {
        const headers = (g as any)?.getHeaders ? (g as any).getHeaders() : {};
        const startFen: string | undefined = headers?.FEN;
        const NextCtor: any = (board as any)?.constructor ?? (Chess as any);
        setBoard(startFen ? new NextCtor(startFen) : new NextCtor());
      } catch {}
    } catch {}
  };

  return (
    <Grid display="flex" justifyContent="center" alignItems="center" width="100%">
      <input type="file" accept=".pgn,text/plain" hidden ref={fileInputRef} onChange={onChange} />
      <Typography variant="body2" sx={{ cursor:'pointer', textDecoration:'underline', textTransform:'uppercase', fontWeight:600 }} onClick={()=> fileInputRef.current?.click()}>Load Another Game</Typography>
    </Grid>
  );
}
