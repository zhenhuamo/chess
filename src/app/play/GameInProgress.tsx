"use client";
import { Button, Stack, Typography } from "@mui/material";
import { usePlayState } from "./PlayState";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { formatGameToDatabase, setGameHeaders } from "@/src/lib/chess";

export default function GameInProgress() {
  const { endGame, isGameInProgress, lastPgn, config } = usePlayState();
  const router = useRouter();
  const resign = () => endGame();
  const openAnalysis = async () => {
    try {
      if (!lastPgn) return;
      const g = new Chess(); g.loadPgn(lastPgn);
      console.log('[DB][PlayInProgress->OpenAnalysis] lastPgn loaded. moves=', g.history().length);
      const { openDB } = await import('idb');
      const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { console.log('[DB][upgrade] creating store "games"'); db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
      console.log('[DB] opened. stores=', Array.from(db.objectStoreNames||[]));
      try {
        const raw = localStorage.getItem('play-draft-id');
        if (raw) {
          const draftId = Number(raw);
          const rec = { ...(formatGameToDatabase(g) as any), playerSide: config?.youPlay, origin: 'play', engineVariant: config?.variant, id: draftId } as any;
          await db.put('games', rec);
          console.log('[DB][OpenAnalysis] reuse draft id=', draftId, 'moves=', g.history().length);
          router.push(`/analyze?gameId=${draftId}`);
          return;
        }
        const engineLabel = (() => {
          const v = config?.variant || 'sf17-lite';
          if (v.startsWith('sf17')) return 'Stockfish 17';
          if (v.startsWith('sf161')) return 'Stockfish 16.1';
          if (v.startsWith('sf16')) return 'Stockfish 16';
          if (v.startsWith('sf11')) return 'Stockfish 11';
          return 'Stockfish';
        })();
        const whiteIsYou = (config?.youPlay ?? 'w') === 'w';
        setGameHeaders(g, { white: { name: whiteIsYou ? 'You' : engineLabel }, black: { name: whiteIsYou ? engineLabel : 'You' } });
      } catch {}
      const rec = { ...(formatGameToDatabase(g) as any), playerSide: config?.youPlay, origin: 'play', engineVariant: config?.variant } as any;
      console.log('[DB] adding record', { moves: g.history().length, headers: g.getHeaders(), meta: { playerSide: config?.youPlay, engineVariant: config?.variant } });
      const id = await db.add('games', rec);
      console.log('[DB] add OK. new id=', id);
      router.push(`/analyze?gameId=${id}`);
    } catch {
      console.warn('[DB] failed to persist to IndexedDB, falling back to /game?pgn=...');
      if (lastPgn) router.push(`/game?pgn=${encodeURIComponent(lastPgn)}&auto=1`);
    }
  };
  if (!isGameInProgress) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">Game In Progress</Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={resign}>Resign</Button>
        <Button variant="contained" onClick={openAnalysis}>Open Game Analysis</Button>
      </Stack>
    </Stack>
  );
}
