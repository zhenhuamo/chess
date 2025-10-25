"use client";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { usePlayState } from "./PlayState";
import { Chess } from "chess.js";
import { useMemo, useState } from "react";
import { getEvaluateGameParams } from "@/src/lib/chess";
import { computeAccuracy } from "@/src/lib/engine/helpers/accuracy";
import { computeEstimatedElo } from "@/src/lib/engine/helpers/estimateElo";
import { useStockfishPool } from "../hooks/useStockfishPool";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useRouter } from "next/navigation";
import { formatGameToDatabase, setGameHeaders } from "@/src/lib/chess";

export default function GameRecap() {
  const { isGameInProgress, lastPgn, config } = usePlayState();
  const pool = useStockfishPool();
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [series, setSeries] = useState<{ ply: number; cp: number; mate?: number }[]>([]);
  const [accuracy, setAccuracy] = useState<{ white: number; black: number } | undefined>(undefined);
  const [estimatedElo, setEstimatedElo] = useState<{ white: number; black: number } | undefined>(undefined);
  const [keyMoments, setKeyMoments] = useState<number[]>([]);

  if (isGameInProgress) return null;

  const analyze = async () => {
    if (!lastPgn) return;
    setAnalyzing(true);
    setProgress(0);
    try {
      const g = new Chess();
      g.loadPgn(lastPgn);
      const { fens } = getEvaluateGameParams(g as any);
      const out: { ply: number; cp: number; mate?: number }[] = [];
      const local = await pool.evaluateFensLocal(fens, { depth: 18, mpv: 3, workers: 2, threadsPerWorker: 2, variant: 'sf17-lite' as any, onProgress: (done)=> setProgress(Math.round(done / fens.length * 100)) });
      const positions: any[] = [];
      for (let i = 0; i < fens.length; i++) {
        const fen = fens[i];
        const res: any = local[i] || { lines: [] };
        positions.push({ bestMove: res.bestMove, lines: (res.lines||[]).map((l:any)=>({ pv: l.pv, cp: l.cp, mate: l.mate, depth: l.depth, multiPv: l.multiPv })) });
        const top = res?.lines?.[0];
        let cp = 0; let mate: number | undefined;
        if (top && typeof (top as any).mate === 'number') { mate = (top as any).mate as number; cp = mate > 0 ? 100000 : -100000; }
        else if (top && typeof (top as any).cp === 'number') { const side = fen.split(' ')[1]; cp = side === 'w' ? (top as any).cp : -(top as any).cp; }
        out.push({ ply: i + 1, cp, mate });
      }
      setSeries(out);
      try { const acc = computeAccuracy(positions as any); setAccuracy({ white: Number(acc.white.toFixed(1)), black: Number(acc.black.toFixed(1)) }); } catch { setAccuracy(undefined); }
      try { const est = computeEstimatedElo(positions as any); if (est) setEstimatedElo({ white: Math.round(est.white), black: Math.round(est.black) }); } catch { setEstimatedElo(undefined); }
      // key moments: large swings
      const diffs = out.map((p, i)=> i===0?0: Math.abs(p.cp - out[i-1].cp));
      const picks = diffs.map((d,i)=>({d,i})).sort((a,b)=> b.d-a.d).filter(p=> p.d>=80).slice(0,10).map(p=> p.i);
      setKeyMoments(picks);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="subtitle1">Game Recap</Typography>
      {!lastPgn && <Typography variant="body2" color="text.secondary">No finished game yet.</Typography>}
      {lastPgn && !series.length && (
        <Stack spacing={1}>
          <Button variant="outlined" onClick={analyze} disabled={analyzing}>{analyzing? `Analyzing ${progress}%` : 'Analyze full game'}</Button>
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
          {analyzing && <LinearProgress variant="determinate" value={progress} />}
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
