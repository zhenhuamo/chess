"use client";
import React, { useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Chess } from 'chess.js';
import { logEvent } from '@/src/lib/telemetry';

type ExplorerGame = {
  id: string;
  winner?: string;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  year?: number;
  month?: string;
};

export default function ModelGames({ games }: { games?: ExplorerGame[] }) {
  const [opening, setOpening] = useState(false);

  const onOpen = async (id: string) => {
    if (!id) return;
    try {
      setOpening(true);
      // Fetch PGN from Lichess
      const r = await fetch(`https://lichess.org/game/export/${id}?clocks=false&evals=false&opening=true`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pgn = await r.text();
      if (!pgn) return;

      const { openDB } = await import('idb');
      const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } });

      const g = new Chess();
      g.loadPgn(pgn);
      const headers = (g as any).getHeaders?.() || {};
      const rec: any = {
        pgn,
        event: headers.Event,
        site: headers.Site,
        date: headers.Date,
        round: headers.Round,
        white: { name: headers.White },
        black: { name: headers.Black },
        result: headers.Result,
        termination: headers.Termination,
        timeControl: headers.TimeControl
      };

      const gid = await db.add('games', rec);
      location.href = `/analyze?gameId=${gid}`;
      logEvent('model_open', { id, source: 'lichess_explore' });
    } catch (e) {
      console.error('[ModelGames] open failed', e);
    } finally { setOpening(false); }
  };

  if (!games || games.length === 0) return null;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Model Games</Typography>
      <Stack spacing={0.5}>
        {games.slice(0, 5).map((g, i) => {
          const title = `${g.white.name} (${g.white.rating}) vs ${g.black.name} (${g.black.rating})`;
          const result = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2';
          return (
            <Paper key={g.id} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {g.year} · {result}
                </Typography>
              </Box>
              <Button size="small" onClick={() => onOpen(g.id)} disabled={opening}>Open</Button>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
