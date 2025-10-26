"use client";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { usePlayState } from "./PlayState";
import { Chess } from "chess.js";
import { useMemo, useState } from "react";
import { getEvaluateGameParams } from "@/src/lib/chess";
import { computeAccuracy } from "@/src/lib/engine/helpers/accuracy";
import { computeEstimatedElo } from "@/src/lib/engine/helpers/estimateElo";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useRouter } from "next/navigation";
import { formatGameToDatabase, setGameHeaders } from "@/src/lib/chess";

export default function GameRecap() {
  const { isGameInProgress, lastPgn, config } = usePlayState();
  const router = useRouter();
  const [series, setSeries] = useState<{ ply: number; cp: number; mate?: number }[]>([]);
  const [accuracy, setAccuracy] = useState<{ white: number; black: number } | undefined>(undefined);
  const [estimatedElo, setEstimatedElo] = useState<{ white: number; black: number } | undefined>(undefined);
  const [keyMoments, setKeyMoments] = useState<number[]>([]);

  if (isGameInProgress) return null;

  // Note: Full local analysis removed by request. Keep recap graph hidden until a future server-side analyzer is added.

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="subtitle1">Game Recap</Typography>
      {!lastPgn && <Typography variant="body2" color="text.secondary">No finished game yet.</Typography>}
      {lastPgn && !series.length && (
        <Stack spacing={1}>
          <Button variant="contained" onClick={async () => {
            try {
              const g = new Chess();
              g.loadPgn(lastPgn);
              console.log('[DB][Play->OpenAnalysis] lastPgn loaded. moves=', g.history().length);

              // Set headers (site/date/players), so分析页顶部不再是问号
              try {
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
              } catch (e) {
                console.warn('[DB] failed to set game headers', e);
              }

              // Persist game with metadata about who the player was and which engine variant was used.
              try {
                const { openDB } = await import('idb');
                const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { console.log('[DB][upgrade] creating store "games"'); db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
                console.log('[DB] opened. stores=', Array.from(db.objectStoreNames||[]));

                // Try reuse autosave draft if exists
                let gameId: number | undefined;
                try {
                  const raw = localStorage.getItem('play-draft-id');
                  if (raw) {
                    const draftId = Number(raw);
                    const meta = { playerSide: config?.youPlay, origin: 'play', engineVariant: config?.variant } as any;
                    const rec = { ...(formatGameToDatabase(g) as any), ...meta, id: draftId } as any;
                    await db.put('games', rec);
                    console.log('[DB][OpenAnalysis] reuse draft id=', draftId, 'moves=', g.history().length);
                    gameId = draftId;
                  }
                } catch (e) {
                  console.warn('[DB] failed to reuse draft', e);
                }

                // Create new record if no draft id
                if (!gameId) {
                  const meta = { playerSide: config?.youPlay, origin: 'play', engineVariant: config?.variant } as any;
                  const rec = { ...(formatGameToDatabase(g) as any), ...meta };
                  console.log('[DB] adding record', { moves: g.history().length, headers: g.getHeaders(), meta });
                  gameId = (await db.add('games', rec as any)) as unknown as number;
                  console.log('[DB] add OK. new id=', gameId);
                }

                // Navigate to analysis page
                if (gameId) {
                  console.log('[DB][OpenAnalysis] navigating to /analyze?gameId=', gameId);
                  router.push(`/analyze?gameId=${gameId}`);
                } else {
                  throw new Error('No game ID returned');
                }
              } catch (dbError) {
                console.error('[DB] database error:', dbError);
                console.warn('[DB] falling back to /analyze with embedded PGN');
                // Fallback: navigate to analyze page without gameId, but with the game loaded in state
                router.push('/analyze');
              }
            } catch (error) {
              console.error('[GameRecap] unexpected error:', error);
              // Last resort fallback
              router.push('/analyze');
            }
          }}>Open Game Analysis</Button>
        </Stack>
      )}

      {series.length>0 && (
        <Stack spacing={1.5}>
          {(accuracy || estimatedElo) && (
            <Typography variant="body2" color="text.secondary">
              {accuracy? `Accuracy W ${accuracy.white}% · B ${accuracy.black}%` : ''}
              {estimatedElo? `  · Estimated Elo W ${estimatedElo.white} / B ${estimatedElo.black}` : ''}
            </Typography>
          )}
          <Box sx={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <XAxis dataKey="ply" tick={{ fontSize: 10 }} />
                <YAxis domain={[-800,800]} tickFormatter={(v:any)=> (v/100).toFixed(1)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v:any)=> (Number(v)/100).toFixed(2)} labelFormatter={(l:any)=> `Ply ${l}`} />
                <ReferenceLine y={0} stroke="#888" />
                <Line type="monotone" dataKey="cp" stroke="#06b6d4" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          {keyMoments.length>0 && (
            <Typography variant="caption" color="text.secondary">Key moments at plies: {keyMoments.join(', ')}</Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
