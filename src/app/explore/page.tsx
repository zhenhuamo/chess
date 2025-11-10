"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, CircularProgress, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import { Chess } from "chess.js";
import { atom, useAtom, useSetAtom } from "jotai";
import Board from "@/src/components/board";
import { Color } from "@/src/types/enums";

type Fen4 = string;
type MoveStat = { games: number; wrWhite?: number; wrBlack?: number };
type Node = { total: number; moves: Record<string, MoveStat> };

const localGameAtom = atom(new Chess());

export default function ExplorePage() {
  const [game, setGame] = useAtom(localGameAtom);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [fen, setFen] = useState<string>(() => game.fen());
  const [index, setIndex] = useState<Map<Fen4, Node> | null>(null);
  const [fileKey, setFileKey] = useState<string>('lichess-4000.pgn');
  const [fromCache, setFromCache] = useState<string | null>(null);

  const STREAM_ENDPOINT = (process.env.NEXT_PUBLIC_EXPLORE_STREAM_ENDPOINT || '/api/explore/stream');
  const versionTag = useCallback(() => `stream:${fileKey}:algo:v0:max16`, [fileKey]);

  const loadCache = useCallback(async (version: string) => {
    try {
      const dbMod = await import('idb');
      const openDB = (dbMod as any).openDB || (dbMod as any).default?.openDB;
      const db = await openDB('explore', 1, { upgrade(db: any) { if (!db.objectStoreNames.contains('indexes')) db.createObjectStore('indexes', { keyPath: 'version' }); } });
      const rec: any = await db.get('indexes', version);
      if (rec?.data) return new Map<Fen4, Node>(rec.data);
    } catch {}
    return null;
  }, []);

  const saveCache = useCallback(async (version: string, map: Map<Fen4, Node>) => {
    try {
      const dbMod = await import('idb');
      const openDB = (dbMod as any).openDB || (dbMod as any).default?.openDB;
      const db = await openDB('explore', 1, { upgrade(db: any) { if (!db.objectStoreNames.contains('indexes')) db.createObjectStore('indexes', { keyPath: 'version' }); } });
      await db.put('indexes', { version, data: Array.from(map.entries()), savedAt: Date.now() });
    } catch {}
  }, []);

  // Build index from stream (MVP, whole-file text, limited depth and Top-N during UI rendering)
  const buildIndex = useCallback(async (force?: boolean) => {
    try {
      setLoading(true); setErr(null); setFromCache(null);
      const ver = versionTag();
      if (!force) {
        const cached = await loadCache(ver);
        if (cached) { setIndex(cached); setFromCache(ver); setProgress('Loaded from cache'); return; }
      }
      setProgress('Fetching PGN…');
      const r = await fetch(`${STREAM_ENDPOINT}?file=${encodeURIComponent(fileKey)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      const games = splitPgn(text);
      const map = new Map<Fen4, Node>();
      let processed = 0;
      for (let i = 0; i < games.length; i++) {
        const gtxt = games[i];
        if (!gtxt) continue;
        try {
          const res = extractResult(gtxt);
          const chess = new Chess();
          try { chess.loadPgn(gtxt); } catch { continue; }
          const verbose = chess.history({ verbose: true }) as any[];
          // Re-simulate for fen-by-ply up to depth limit
          const startFen = (chess as any).getHeaders?.()?.FEN as string | undefined;
          const sim = new Chess(startFen);
          const maxPlies = 16; // limit depth
          for (let ply = 0; ply < verbose.length && ply < maxPlies; ply++) {
            const beforeFen = fen4(sim.fen());
            const mv = verbose[ply];
            const uci = (mv.from as string) + (mv.to as string) + (mv.promotion || '');
            const side = sim.turn(); // 'w' or 'b' before move
            // update map
            const node = map.get(beforeFen) || { total: 0, moves: {} };
            node.total += 1;
            const ms = node.moves[uci] || { games: 0 };
            ms.games += 1;
            // approximate win rate for side to move using game result
            if (res) {
              const s = side === 'w' ? res.white : res.black;
              const key = side === 'w' ? 'wrWhite' : 'wrBlack';
              const prev = (ms as any)[key] || 0;
              // running average by occurrences at this node
              const count = (ms as any)[key + '_n'] || 0;
              const next = (prev * count + s) / (count + 1);
              (ms as any)[key] = next;
              (ms as any)[key + '_n'] = count + 1;
            }
            node.moves[uci] = ms;
            map.set(beforeFen, node);
            try { sim.move({ from: mv.from, to: mv.to, promotion: mv.promotion }); } catch { break; }
          }
        } catch {}
        processed++;
        if (i % 50 === 0) setProgress(`Indexed ${processed}/${games.length} games…`);
        // yield to UI
        if (i % 200 === 0) await new Promise(res => setTimeout(res, 0));
      }
      setIndex(map);
      try { await saveCache(ver, map); } catch {}
      setProgress(`Done: ${processed} games.`);
    } catch (e: any) {
      setErr(e?.message || 'Failed to build index');
    } finally {
      setLoading(false);
    }
  }, [fileKey, STREAM_ENDPOINT, versionTag, loadCache, saveCache]);

  useEffect(() => { buildIndex(); }, [buildIndex]);

  // When fen input changes, try to set board
  const onApplyFen = useCallback(() => {
    try { const d = new Chess(fen); setGame(d); } catch { /* ignore */ }
  }, [fen, setGame]);

  const topMoves = useMemo(() => {
    if (!index) return [] as Array<{ uci: string; games: number; win?: number; san: string }>;
    const f4 = fen4(game.fen());
    let node = index.get(f4);
    if (!node) {
      const f2 = fen2(game.fen());
      const agg: Node = { total: 0, moves: {} };
      index.forEach((n, k) => {
        if (k.startsWith(f2)) {
          agg.total += n.total;
          for (const [uci, ms] of Object.entries(n.moves)) {
            const cur = agg.moves[uci] || { games: 0 };
            cur.games += ms.games;
            if (typeof ms.wrWhite === 'number') {
              const cnt = (cur as any).wrWhite_n || 0; const prev = (cur.wrWhite || 0) * cnt; const nextCnt = cnt + 1; (cur as any).wrWhite_n = nextCnt; cur.wrWhite = (prev + ms.wrWhite) / nextCnt;
            }
            if (typeof ms.wrBlack === 'number') {
              const cnt = (cur as any).wrBlack_n || 0; const prev = (cur.wrBlack || 0) * cnt; const nextCnt = cnt + 1; (cur as any).wrBlack_n = nextCnt; cur.wrBlack = (prev + ms.wrBlack) / nextCnt;
            }
            agg.moves[uci] = cur;
          }
        }
      });
      node = agg.total > 0 ? agg : undefined as any;
    }
    if (!node) return [];
    const side = game.turn();
    const entries = Object.entries(node.moves).map(([uci, ms]) => {
      const win = side === 'w' ? ms.wrWhite : ms.wrBlack;
      const san = uciToSan(game.fen(), uci);
      return { uci, games: ms.games, win, san };
    });
    return entries.sort((a,b)=> (b.games - a.games) || ((b.win||0)-(a.win||0))).slice(0,5);
  }, [index, game]);

  // Stable player objects (avoid re-creating each render to prevent Board effects from looping)
  const whitePlayer = useMemo(() => ({ name: 'White' }), []);
  const blackPlayer = useMemo(() => ({ name: 'Black' }), []);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 }, width: '100%', maxWidth: 1200 }}>
        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Position Explorer (MVP)</Typography>
          <Typography variant="body2" color="text.secondary">Data from R2 via /api/explore/stream · file: {fileKey}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="FEN" fullWidth value={fen} onChange={(e)=> setFen(e.target.value)} />
            <Button variant="outlined" onClick={onApplyFen}>应用 FEN</Button>
            <Button size="small" onClick={()=> setFileKey('lichess-4000.pgn')}>4000</Button>
            <Button size="small" onClick={()=> setFileKey('lichess-2025-08-2000.pgn')}>2000(Aug)</Button>
            <Button size="small" onClick={()=> setFileKey('lichess-2000.pgn')}>2000</Button>
            <Button size="small" variant="outlined" onClick={()=> buildIndex(true)}>Rebuild</Button>
          </Stack>

          {loading && (
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}><CircularProgress size={18} /> <Typography variant="body2">{progress}</Typography></Box>
          )}
          {fromCache && (<Typography variant="caption" color="text.secondary">Loaded from cache · {fromCache}</Typography>)}
          {err && (<Typography color="error">{err}</Typography>)}

          <Divider />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '0 0 420px' }}>
              <Board
                id="explore"
                canPlay={false}
                gameAtom={localGameAtom}
                boardOrientation={Color.White}
                whitePlayer={whitePlayer}
                blackPlayer={blackPlayer}
                showEvaluationBar={false}
              />
            </Box>
            <Box sx={{ flex: '1 1 360px', minWidth: 320 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Top Moves</Typography>
              <Stack spacing={0.5}>
                {topMoves.map((m,i)=> (
                  <Paper key={i} variant="outlined" sx={{ p: 1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <Typography variant="body2" sx={{ fontFamily:'monospace' }}>{m.san || m.uci}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.games} · {typeof m.win==='number'? `${Math.round(m.win*100)}%`:'—'}</Typography>
                  </Paper>
                ))}
                {(!topMoves.length) && <Typography variant="body2" color="text.secondary">当前位置暂无数据，尝试减少深度或切换文件。</Typography>}
              </Stack>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

function splitPgn(text: string): string[] {
  // Simple splitter: start at lines with [Event ...
  const chunks: string[] = [];
  const lines = text.split(/\r?\n/);
  let cur: string[] = [];
  for (const ln of lines) {
    if (ln.startsWith('[Event ')) {
      if (cur.length) chunks.push(cur.join('\n').trim());
      cur = [ln];
    } else {
      cur.push(ln);
    }
  }
  if (cur.length) chunks.push(cur.join('\n').trim());
  return chunks;
}

function fen4(fen: string): string { return fen.split(' ').slice(0,4).join(' '); }
function fen2(fen: string): string { return fen.split(' ').slice(0,2).join(' '); }

function extractResult(pgn: string): { white: number; black: number } | null {
  const m = pgn.match(/\n\[Result\s+"([^"]+)"\]/);
  const r = m?.[1];
  switch (r) {
    case '1-0': return { white: 1, black: 0 };
    case '0-1': return { white: 0, black: 1 };
    case '1/2-1/2': return { white: 0.5, black: 0.5 };
    default: return null;
  }
}

function uciToSan(fen: string, uci: string): string {
  try {
    const d = new Chess(fen);
    const move: any = { from: uci.slice(0,2), to: uci.slice(2,4) };
    if (uci.length > 4) move.promotion = uci.slice(4);
    const m = d.move(move);
    return m?.san || uci;
  } catch { return uci; }
}
