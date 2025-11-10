"use client";
import React, { useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { SHARE_API_BASE } from '@/src/config/share';
import { Chess } from 'chess.js';

type MoveStat = { games: number; wrWhite?: number; wrBlack?: number };
type Node = { total: number; moves: Record<string, MoveStat>; models?: string[] };

function fen4(fen: string): string { return fen.split(' ').slice(0,4).join(' '); }

export default function ModelGames({ indexMap, rootFen, maxCount = 6 }: { indexMap: Map<string, Node>; rootFen: string; maxCount?: number }) {
  const [opening, setOpening] = useState(false);
  const ids = useMemo(() => {
    try {
      const d = new Chess(rootFen);
      const n = indexMap.get(fen4(d.fen()));
      const arr = Array.isArray(n?.models) ? n!.models! : [];
      return arr.slice(0, Math.max(1, Math.min(maxCount, 10)));
    } catch { return [] as string[]; }
  }, [indexMap, rootFen, maxCount]);

  if (!ids.length) return null;

  const onOpen = async (idPath: string) => {
    if (!idPath) return;
    try {
      setOpening(true);
      const id = idPath.split('/').pop() || idPath;
      const r = await fetch(`${SHARE_API_BASE}/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const js = await r.json();
      const pgn = (js?.pgn || '').toString();
      if (!pgn) return;
      const { openDB } = await import('idb');
      const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } });
      const g = new Chess();
      g.loadPgn(pgn);
      const headers = (g as any).getHeaders?.() || {};
      const rec: any = { pgn, event: headers.Event, site: headers.Site, date: headers.Date, round: headers.Round, white: { name: headers.White }, black: { name: headers.Black }, result: headers.Result, termination: headers.Termination, timeControl: headers.TimeControl };
      const gid = await db.add('games', rec);
      location.href = `/analyze?gameId=${gid}`;
    } catch (e) {
      console.error('[ModelGames] open failed', e);
    } finally { setOpening(false); }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Model Games</Typography>
      <Stack spacing={0.5}>
        {ids.map((s, i) => (
          <Paper key={`${s}-${i}`} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontFamily:'monospace' }}>{s}</Typography>
            <Button size="small" onClick={()=> onOpen(s)} disabled={opening}>Open in Analyzer</Button>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

