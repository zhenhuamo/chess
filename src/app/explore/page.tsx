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

  // Resolve stream endpoint once (env or default). Keep outside of dependencies to avoid re-decl errors.
  const STREAM_ENDPOINT = useMemo(() => (process.env.NEXT_PUBLIC_EXPLORE_STREAM_ENDPOINT || '/api/explore/stream'), []);
  const MANIFEST_ENDPOINT = useMemo(() => (process.env.NEXT_PUBLIC_EXPLORE_MANIFEST_ENDPOINT || '/api/explore/manifest'), []);
  const INDEX_ENDPOINT = useMemo(() => (process.env.NEXT_PUBLIC_EXPLORE_INDEX_ENDPOINT || '/api/explore/index'), []);

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

  
  // Try fast-path: load prebuilt index from R2 via manifest/index endpoints
  const tryLoadPrebuiltIndex = useCallback(async () => {
    try {
      setProgress('Loading index manifest…');
      const mr = await fetch(MANIFEST_ENDPOINT, { cache: 'force-cache' });
      if (!mr.ok) return null;
      const manifest = await mr.json().catch(()=>null) as any;
      const indexUrl = manifest?.index || manifest?.url;
      const version = manifest?.version || manifest?.ver || 'v2';
      if (!indexUrl) return null;
      setProgress('Loading prebuilt index…');
      const ir = await fetch(`${INDEX_ENDPOINT}?url=${encodeURIComponent(indexUrl)}`, { cache: 'force-cache' });
      if (!ir.ok) return null;
      const idxJson = await ir.json().catch(()=>null) as any;
      if (!idxJson) return null;
      const map = normalizeIndexJsonToMap(idxJson);
      return { map, version };
    } catch { return null; }
  }, [MANIFEST_ENDPOINT, INDEX_ENDPOINT]);

  function normalizeIndexJsonToMap(j: any): Map<Fen4, Node> {
    // Accept several shapes: {entries:[[fen,node],...]}, {nodes:[{fen4,...}]}, or object map
    const m = new Map<Fen4, Node>();
    if (!j) return m;
    if (Array.isArray(j.entries)) {
      for (const [k, v] of j.entries) m.set(String(k), adaptNode(v));
      return m;
    }
    if (Array.isArray(j.nodes)) {
      for (const n of j.nodes) { if (n?.fen4) m.set(String(n.fen4), adaptNode(n)); }
      return m;
    }
    if (typeof j === 'object') {
      for (const k of Object.keys(j)) m.set(String(k), adaptNode(j[k]));
      return m;
    }
    return m;
  }
  function adaptNode(src: any): Node {
    const moves: Record<string, MoveStat> = {};
    const arr = Array.isArray(src?.moves)? src.moves : [];
    for (const mv of arr) {
      if (!mv?.uci) continue;
      moves[mv.uci] = { games: Number(mv.games||0), wrWhite: typeof mv.wrWhite==='number'? mv.wrWhite: undefined, wrBlack: typeof mv.wrBlack==='number'? mv.wrBlack: undefined };
    }
    const total = Number(src?.totalGames || src?.total || 0);
    return { total, moves };
  }
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
      // Fast-path: prebuilt index from R2 (if available)
      const prebuilt = await tryLoadPrebuiltIndex();
      if (prebuilt?.map && prebuilt.map.size>0) {
        setIndex(prebuilt.map); setFromCache(prebuilt.version || 'prebuilt'); setProgress('Loaded prebuilt index'); return;
      }

      // Try worker mode
      try {
        const worker = new Worker(new URL('./explore-index.worker.ts', import.meta.url), { type: 'module' });
        const result = await new Promise<Map<Fen4, Node>>((resolve, reject) => {
          worker.onmessage = async (e: MessageEvent) => {
            const msg = e.data || {};
            if (msg.type === 'progress') setProgress(msg.message || '');
            else if (msg.type === 'done') { const map = new Map<Fen4, Node>(msg.entries || []); resolve(map); worker.terminate(); }
            else if (msg.type === 'error') { reject(new Error(msg.message || 'worker_failed')); worker.terminate(); }
          };
          worker.onerror = (ev) => { reject(new Error(String((ev as any).message || 'worker_error'))); try { worker.terminate(); } catch {} };
          worker.postMessage({ type: 'build', endpoint: STREAM_ENDPOINT, file: fileKey, maxPlies: 16 });
        });
        setIndex(result); try { (globalThis as any).__EXPLORE_INDEX_MAP = result; } catch {}
        try { await saveCache(ver, result); } catch {}
        setProgress('Done.');
      } catch (werr) {
        // Fallback inline
        setProgress('Fetching PGN…');
        const r = await fetch(`${STREAM_ENDPOINT}?file=${encodeURIComponent(fileKey)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        const games = splitPgn(text);
        const map = await inlineBuild(games, (d, t) => setProgress(`Indexed ${d}/${t} games…`));
        setIndex(map); try { (globalThis as any).__EXPLORE_INDEX_MAP = map; } catch {}
        try { await saveCache(ver, map); } catch {}
        setProgress('Done.');
      }

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
              
              <Typography variant="subtitle2" sx={{ mt: 2 }}>Mini Book</Typography>
              <Stack spacing={0.25}>
                {renderMiniBook(game.fen(), 2)}
              </Stack>
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


async function inlineBuild(games: string[], onProgress?: (done: number, total: number) => void): Promise<Map<Fen4, Node>> {
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
      const startFen = (chess as any).getHeaders?.()?.FEN as string | undefined;
      const sim = new Chess(startFen);
      const maxPlies = 16;
      for (let ply = 0; ply < verbose.length && ply < maxPlies; ply++) {
        const beforeFen = fen4(sim.fen());
        const mv = verbose[ply];
        const uci = String(mv.from) + String(mv.to) + (mv.promotion || '');
        const side = sim.turn();
        const node = map.get(beforeFen) || { total: 0, moves: {} };
        node.total += 1;
        const ms: any = node.moves[uci] || { games: 0 };
        ms.games += 1;
        if (res) {
          const score = side === 'w' ? res.white : res.black;
          const key = side === 'w' ? 'wrWhite' : 'wrBlack';
          const cnt = (ms[key + '_n'] || 0) + 1;
          const prev = (ms[key] || 0) * (cnt - 1);
          ms[key] = (prev + score) / cnt;
          ms[key + '_n'] = cnt;
        }
        node.moves[uci] = ms;
        map.set(beforeFen, node);
        try { sim.move({ from: mv.from, to: mv.to, promotion: mv.promotion }); } catch { break; }
      }
    } catch {}
    processed++;
    if (onProgress && i % 50 === 0) onProgress(processed, games.length);
    if (i % 200 === 0) await new Promise(res => setTimeout(res, 0));
  }
  return map;
}

function renderMiniBook(rootFen: string, depth: number): any {
  try {
    const d = new Chess(rootFen);
    const f4 = fen4(d.fen());
    // Use existing index loaded in component via closure (hack: not accessible here), so fallback: no tree when not in scope.
    // In this simple MVP, recompute topMoves for this fen using window.__EXPLORE_INDEX if present.
    const anyWin: any = (globalThis as any);
    const index: Map<string, Node> | undefined = anyWin.__EXPLORE_INDEX_MAP;
    if (!index) return null;
    const node = index.get(f4);
    if (!node) return null;
    const side = d.turn();
    const entries = Object.entries(node.moves).map(([uci, ms]) => {
      const win = side==='w'? ms.wrWhite : ms.wrBlack;
      const san = uciToSan(d.fen(), uci);
      return { uci, games: ms.games, win, san };
    }).sort((a,b)=> (b.games-a.games)||((b.win||0)-(a.win||0))).slice(0,3);
    return entries.map((m:any, i:number) => {
      let child: any = null;
      if (depth>0) {
        const c = new Chess(rootFen);
        try { c.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci.slice(4) || undefined }); child = renderMiniBook(c.fen(), depth-1); } catch {}
      }
      return (
        <Box key={`${f4}-${m.uci}-${i}`} sx={{ pl: (2-depth)*1.5 }}>
          <Typography variant="caption" sx={{ fontFamily:'monospace' }}>{m.san || m.uci}</Typography>
          <Typography variant="caption" color="text.secondary"> · {m.games} · {typeof m.win==='number'? `${Math.round(m.win*100)}%`:'—'}</Typography>
          {child}
        </Box>
      );
    });
  } catch { return null; }
}
