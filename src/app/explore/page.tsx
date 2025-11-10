"use client";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Box, Button, CircularProgress, Divider, Paper, Stack, TextField, Typography, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, Chip, Alert } from "@mui/material";
import { Chess } from "chess.js";
import { atom, useAtom } from "jotai";
import Board from "@/src/components/board";
import { Color } from "@/src/types/enums";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PreviewRoundedIcon from '@mui/icons-material/PreviewRounded';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useChessActions } from "@/src/hooks/useChessActions";
import MiniBook from "./components/MiniBook";
import ModelGames from "./components/ModelGames";

type Fen4 = string;
type MoveStat = { games: number; wrWhite?: number; wrBlack?: number };
type Node = { total: number; moves: Record<string, MoveStat>; models?: string[] };

const localGameAtom = atom(new Chess());
const previewGameAtom = atom(new Chess());

export default function ExplorePage() {
  const [game, setGame] = useAtom(localGameAtom);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [fen, setFen] = useState<string>(() => game.fen());
  const [index, setIndex] = useState<Map<Fen4, Node> | null>(null);
  const [fileKey, setFileKey] = useState<string>('lichess-4000.pgn');
  const [fromCache, setFromCache] = useState<string | null>(null);
  const [indexSource, setIndexSource] = useState<'prebuilt'|'stream'|'cache'|null>(null);
  const [manifestMeta, setManifestMeta] = useState<any>(null);

  // UI states
  const [sortKey, setSortKey] = useState<'hot'|'win'>('hot');
  const [preview, setPreview] = useState<{ active: boolean; baseFen?: string; line?: string[] }>({ active: false });
  const [fallbackInfo, setFallbackInfo] = useState<{ type: 'fen4'|'fen2'|'ancestor'|'none'; depth?: number }>({ type: 'none' });
  const [trainingQueueSize, setTrainingQueueSize] = useState<number>(() => getTrainingQueue().length);

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
      return { map, version, manifest } as any;
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
    const models = Array.isArray(src?.models) ? src.models.map((s: any) => String(s)) : undefined;
    return { total, moves, models };
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
        if (cached) { setIndex(cached); setFromCache(ver); setIndexSource('cache'); setProgress('Loaded from cache'); return; }
      }
      // Fast-path: prebuilt index from R2 (if available)
      const prebuilt = await tryLoadPrebuiltIndex();
      if (prebuilt?.map && prebuilt.map.size>0) {
        setIndex(prebuilt.map); setFromCache(prebuilt.version || 'prebuilt'); setIndexSource('prebuilt'); setManifestMeta(prebuilt.manifest || null); setProgress('Loaded prebuilt index'); return;
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
        setIndex(result); setIndexSource('stream'); try { (globalThis as any).__EXPLORE_INDEX_MAP = result; } catch {}
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
        setIndex(map); setIndexSource('stream'); try { (globalThis as any).__EXPLORE_INDEX_MAP = map; } catch {}
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

  // Chess actions (must be declared before effects that depend on them)
  const { playMove, addMoves } = useChessActions(localGameAtom);
  const { reset: resetPreviewBoard, addMoves: addMovesToPreview } = useChessActions(previewGameAtom);
  const previewTimerRef = useRef<any>(null);
  const activeGameAtom = preview.active ? previewGameAtom : localGameAtom;

  // Keyboard shortcuts for preview actions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Apply preview to main board
      if (e.key === 'Enter' && preview.active) {
        if (e.metaKey || e.ctrlKey) {
          // Add current start move to training if present
          try { const start = (preview as any).startUci as string | undefined; if (start) onAddToTraining(game.fen(), [start], setTrainingQueueSize); } catch {}
        } else {
          e.preventDefault();
          previewApply(preview, addMoves, setPreview);
        }
      }
      // Replay preview
      if (e.key === ' ' && preview.active) {
        e.preventDefault();
        previewReplay(preview, resetPreviewBoard, addMovesToPreview, previewTimerRef);
      }
      // Close preview
      if (e.key === 'Escape' && preview.active) {
        e.preventDefault();
        previewClose(setPreview, previewTimerRef);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, addMoves, setPreview, resetPreviewBoard, addMovesToPreview]);

  // When fen input changes, try to set board
  const onApplyFen = useCallback(() => {
    try { const d = new Chess(fen); setGame(d); } catch { /* ignore */ }
  }, [fen, setGame]);

  const nodeAtFenWithFallback = useCallback((fenStr: string): { node: Node | null; fallback: { type: 'fen4'|'fen2'|'ancestor'|'none'; depth?: number } } => {
    if (!index) return { node: null, fallback: { type: 'none' } };
    const MIN_TOTAL = 50; // minimal samples to accept a node
    const f4 = fen4(fenStr);
    const nodeDirect = index.get(f4);
    if (nodeDirect && (nodeDirect.total || 0) >= MIN_TOTAL) return { node: nodeDirect, fallback: { type: 'fen4', depth: 0 } };
    const f2 = fen2(fenStr);
    const agg: Node = { total: 0, moves: {} };
    index.forEach((n, k) => {
      if (k.startsWith(f2)) {
        agg.total += n.total;
        for (const [uci, ms] of Object.entries(n.moves)) {
          const cur: any = agg.moves[uci] || { games: 0 };
          cur.games += (ms.games || 0);
          if (typeof ms.wrWhite === 'number') {
            const cnt = (cur.wrWhite_n || 0) + 1; const prev = (cur.wrWhite || 0) * (cnt - 1); cur.wrWhite = (prev + ms.wrWhite) / cnt; cur.wrWhite_n = cnt;
          }
          if (typeof ms.wrBlack === 'number') {
            const cnt = (cur.wrBlack_n || 0) + 1; const prev = (cur.wrBlack || 0) * (cnt - 1); cur.wrBlack = (prev + ms.wrBlack) / cnt; cur.wrBlack_n = cnt;
          }
          agg.moves[uci] = cur;
        }
      }
    });
    if (agg.total >= MIN_TOTAL) return { node: agg, fallback: { type: 'fen2', depth: 0 } };
    // Ancestor fallback if we have PGN history
    try {
      const g = new Chess();
      g.loadPgn(game.pgn());
      let depth = 0;
      for (let i = 0; i < 4; i++) {
        const m = g.undo(); if (!m) break; depth++;
        const backFen = g.fen();
        const n = index.get(fen4(backFen));
        if (n && (n.total||0) >= MIN_TOTAL) return { node: n, fallback: { type: 'ancestor', depth } };
        const f2a = fen2(backFen);
        const agga: Node = { total: 0, moves: {} };
        index.forEach((n2, k2) => { if (k2.startsWith(f2a)) { agga.total += n2.total; for (const [uci, ms] of Object.entries(n2.moves)) { const cur: any = (agga.moves[uci] || { games: 0 }); cur.games += (ms.games || 0); agga.moves[uci] = cur; } } });
        if (agga.total >= MIN_TOTAL) return { node: agga, fallback: { type: 'ancestor', depth } };
      }
    } catch {}
    return { node: null, fallback: { type: 'none' } };
  }, [index, game]);

  const topMoves = useMemo(() => {
    if (!index) return [] as Array<{ uci: string; games: number; win?: number; san: string }>;
    const { node, fallback } = nodeAtFenWithFallback(game.fen());
    setFallbackInfo(fallback);
    if (!node) return [];
    const side = game.turn();
    const entries = Object.entries(node.moves).map(([uci, ms]) => {
      const win = side === 'w' ? ms.wrWhite : ms.wrBlack;
      const san = uciToSan(game.fen(), uci);
      return { uci, games: ms.games, win, san };
    });
    if (sortKey === 'win') {
      return entries.sort((a,b)=> ((b.win||-1)-(a.win||-1)) || (b.games - a.games)).slice(0,5);
    }
    return entries.sort((a,b)=> (b.games - a.games) || ((b.win||0)-(a.win||0))).slice(0,5);
  }, [index, game, sortKey, nodeAtFenWithFallback]);

  const onPracticeNow = useCallback(() => {
    if (!index) return;
    try {
      const pv = buildGreedyPv(game.fen(), index, 10);
      const tasks: Array<{ fen: string; acceptedUci: string[]; createdAt: number }> = [];
      let d = new Chess(game.fen());
      for (let i = 0; i < pv.length && tasks.length < 5; i++) {
        const uci = pv[i];
        if (!uci) break;
        // Only create tasks on the plies where it's the current side to move
        tasks.push({ fen: d.fen(), acceptedUci: [uci], createdAt: Date.now() });
        try { d.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci.slice(4) || undefined } as any); } catch { break; }
      }
      if (tasks.length) {
        const q = getTrainingQueue();
        for (const t of tasks) q.push(t);
        try { localStorage.setItem('explore:trainingQueue', JSON.stringify(q)); } catch {}
        setTrainingQueueSize(q.length);
      }
    } catch (e) { console.warn('[PracticeNow] failed', e); }
  }, [index, game]);

  // Stable player objects (avoid re-creating each render to prevent Board effects from looping)
  const whitePlayer = useMemo(() => ({ name: 'White' }), []);
  const blackPlayer = useMemo(() => ({ name: 'Black' }), []);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 }, width: '100%', maxWidth: 1200 }}>
        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Position Explorer</Typography>
          {/* Landing intro */}
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">研究任意位置的下一步：热门分支、胜率、简易书树与范例局；可将分支加入练习。</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={`Source: ${indexSource ?? '—'}`} variant="outlined" />
              {!!fromCache && <Chip size="small" label={`Index: ${fromCache}`} variant="outlined" />}
              {manifestMeta?.date && <Chip size="small" label={`Updated: ${manifestMeta?.date}`} variant="outlined" />}
              <Chip size="small" label={`Nodes: ${index?.size ?? 0}`} variant="outlined" />
              <Chip size="small" label={`Training: ${trainingQueueSize}`} variant="outlined" />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="FEN" fullWidth value={fen} onChange={(e)=> setFen(e.target.value)} />
            <Button variant="outlined" onClick={onApplyFen}>应用 FEN</Button>
            <Button size="small" onClick={()=> setFileKey('lichess-4000.pgn')}>4000</Button>
            <Button size="small" onClick={()=> setFileKey('lichess-2025-08-2000.pgn')}>2000(AUG)</Button>
            <Button size="small" onClick={()=> setFileKey('lichess-2000.pgn')}>2000</Button>
            <Button size="small" variant="outlined" onClick={()=> buildIndex(true)}>Rebuild</Button>
            <Button size="small" variant="contained" onClick={onPracticeNow}>Practice Now (5)</Button>
            {(fallbackInfo.type === 'none') && (
              <Stack direction="row" spacing={0.5}>
                {['e2e4','d2d4','c2c4','g1f3'].map((u)=> (
                  <Button key={u} size="small" onClick={()=> applyExampleMove(u, setFen, onApplyFen)}>示例 {uciToSan(new Chess().fen(), u)}</Button>
                ))}
              </Stack>
            )}
          </Stack>

          {loading && (
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}><CircularProgress size={18} /> <Typography variant="body2">{progress}</Typography></Box>
          )}
          {err && (<Alert severity="error" variant="outlined">{err}</Alert>)}
          {fromCache && (<Typography variant="caption" color="text.secondary">Loaded · {indexSource} · {fromCache}</Typography>)}
          {(fallbackInfo.type !== 'fen4') && (
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ py: 0.5 }}>
              {fallbackInfo.type === 'fen2' && '当前 FEN4 暂无数据，已回退到 fen2 聚合。'}
              {fallbackInfo.type === 'ancestor' && `已回退至 ${fallbackInfo.depth} plies 前的最近有数据位置。`}
              {fallbackInfo.type === 'none' && '未命中数据。请回退半步或从示例起点 e4/d4/c4/Nf3 开始。'}
            </Alert>
          )}

          <Divider />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '0 0 420px' }}>
              <Board
                id="explore"
                canPlay={!preview.active}
                gameAtom={activeGameAtom}
                boardOrientation={Color.White}
                whitePlayer={whitePlayer}
                blackPlayer={blackPlayer}
                showEvaluationBar={false}
              />
            </Box>
            <Box sx={{ flex: '1 1 360px', minWidth: 320 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Top Moves</Typography>
                <ToggleButtonGroup size="small" value={sortKey} exclusive onChange={(_,v)=> v && setSortKey(v)}>
                  <ToggleButton value="hot"><SortRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />Hot</ToggleButton>
                  <ToggleButton value="win">Win%</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Stack spacing={0.5}>
                {topMoves.map((m,i)=> (
                  <Paper key={i} variant="outlined" sx={{ p: 1, display:'flex', alignItems:'center', justifyContent:'space-between', gap: 1 }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Typography variant="body2" sx={{ fontFamily:'monospace' }}>{m.san || m.uci}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.games} · {typeof m.win==='number'? `${Math.round(m.win*100)}%`:'—'}</Typography>
                    </Box>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                      <Tooltip title="Play"><span><IconButton size="small" onClick={()=> onPlayMove(m.uci, game.fen(), playMove)}><PlayArrowRoundedIcon fontSize='small' /></IconButton></span></Tooltip>
                      <Tooltip title="Preview 10 plies"><span><IconButton size="small" onClick={()=> onPreviewMoveInline(m.uci, game.fen(), index, setPreview)}><PreviewRoundedIcon fontSize='small' /></IconButton></span></Tooltip>
                      <Tooltip title="Add to Training"><span><IconButton size="small" onClick={()=> onAddToTraining(game.fen(), [m.uci], setTrainingQueueSize)}><AddTaskRoundedIcon fontSize='small' /></IconButton></span></Tooltip>
                    </Box>
                  </Paper>
                ))}
                {(!topMoves.length) && <Typography variant="body2" color="text.secondary">当前位置暂无数据，尝试减少深度或切换文件。</Typography>}

                <Typography variant="subtitle2" sx={{ mt: 2 }}>Mini Book</Typography>
                <MiniBook indexMap={index || new Map()} rootFen={game.fen()} depth={2} topN={3} onMove={(uci)=> onPlayMove(uci, game.fen(), playMove)} />
                <ModelGames indexMap={index || new Map()} rootFen={game.fen()} />

                {preview.active && (
                  <Paper variant="outlined" sx={{ mt: 2, p: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2">Preview</Typography>
                      <Box>
                        <Tooltip title="Replay"><span><IconButton size="small" onClick={()=> previewReplay(preview, resetPreviewBoard, addMovesToPreview, previewTimerRef)}><RestartAltIcon fontSize='small' /></IconButton></span></Tooltip>
                        <Tooltip title="Apply to board (Enter)"><span><IconButton size="small" onClick={()=> previewApply(preview, addMoves, setPreview)}><PlayArrowRoundedIcon fontSize='small' /></IconButton></span></Tooltip>
                        <Tooltip title="Close (Esc)"><span><IconButton size="small" onClick={()=> previewClose(setPreview, previewTimerRef)}><CloseRoundedIcon fontSize='small' /></IconButton></span></Tooltip>
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily:'monospace' }}>{(preview.line||[]).join(' ') || '—'}</Typography>
                  </Paper>
                )}
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

// Row helpers
function onPlayMove(uci: string, fen: string, playMove: (args: any)=> any) {
  try {
    const d = new Chess(fen);
    const from = uci.slice(0,2), to = uci.slice(2,4); const promotion = uci.slice(4) || undefined;
    const legal = d.move({ from, to, promotion });
    if (!legal) return;
    playMove({ from, to, promotion });
    console.log('[explore] play_click', { uci, fen4: fen4(fen) });
  } catch {}
}

function onAddToTraining(fen: string, acceptedUci: string[], setSize: (n:number)=>void) {
  const q = getTrainingQueue();
  q.push({ fen, acceptedUci, createdAt: Date.now() });
  try { localStorage.setItem('explore:trainingQueue', JSON.stringify(q)); } catch {}
  setSize(q.length);
  console.log('[explore] add_to_training', { fen4: fen4(fen), acceptedUci });
}

function getTrainingQueue(): Array<{ fen: string; acceptedUci: string[]; createdAt: number }> {
  try { const raw = localStorage.getItem('explore:trainingQueue'); if (raw) return JSON.parse(raw) || []; } catch {}
  return [];
}

// Build a quick preview line of up to 10 plies by greedily picking the top move at each node, then start preview board playback
function onPreviewMoveInline(startUci: string, rootFen: string, index: Map<string, Node> | null, setPreview: (p: any)=> void) {
  if (!index) return;
  try {
    const lineSAN: string[] = [];
    const d = new Chess(rootFen);
    // first move
    const mv = { from: startUci.slice(0,2), to: startUci.slice(2,4), promotion: startUci.slice(4) || undefined } as any;
    const res = d.move(mv);
    if (!res) return;
    lineSAN.push(res.san || startUci);
    for (let i = 1; i < 10; i++) {
      const f4 = (d.fen().split(' ').slice(0,4).join(' '));
      const node = index.get(f4);
      if (!node || !node.moves) break;
      const entries = Object.entries(node.moves).map(([uci, ms]) => ({ uci, games: ms.games || 0 }));
      if (!entries.length) break;
      entries.sort((a,b)=> b.games - a.games);
      const u = entries[0].uci;
      const r = d.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u.slice(4) || undefined } as any);
      if (!r) break;
      lineSAN.push(r.san || u);
    }
    setPreview({ active: true, baseFen: rootFen, line: lineSAN, startUci });
    console.log('[explore] preview_click', { startUci, len: lineSAN.length });
  } catch {}
}

// Preview helpers
function previewReplay(preview: any, resetPreviewBoard: (opts: any)=>void, addMovesToPreview: (moves: string[])=>void, timerRef: any) {
  if (!preview?.active || !preview?.baseFen || !Array.isArray(preview.line)) return;
  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  resetPreviewBoard({ fen: preview.baseFen, noHeaders: true });
  let i = 0;
  timerRef.current = setInterval(() => {
    if (i >= preview.line.length) { clearInterval(timerRef.current); timerRef.current = null; return; }
    addMovesToPreview([preview.line[i]]);
    i++;
  }, 350);
}

function previewApply(preview: any, addMoves: (moves: string[])=> void, setPreview: (p:any)=> void) {
  if (!preview?.active || !Array.isArray(preview.line)) return;
  addMoves(preview.line);
  setPreview({ active: false });
}

function previewClose(setPreview: (p:any)=> void, timerRef: any) {
  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  setPreview({ active: false });
}

function applyExampleMove(uci: string, setFen: (s:string)=>void, onApplyFen: ()=>void) {
  try {
    const d = new Chess();
    const from = uci.slice(0,2), to = uci.slice(2,4); const promotion = uci.slice(4) || undefined;
    d.move({ from, to, promotion } as any);
    const f = d.fen();
    setFen(f);
    onApplyFen();
  } catch {}
}

// Build a greedy PV (sequence of uci) by always picking the highest games move at each node
function buildGreedyPv(rootFen: string, index: Map<string, Node>, maxPlies = 10): string[] {
  const out: string[] = [];
  try {
    const d = new Chess(rootFen);
    for (let i = 0; i < maxPlies; i++) {
      const f4 = (d.fen().split(' ').slice(0,4).join(' '));
      const node = index.get(f4);
      if (!node) break;
      const entries = Object.entries(node.moves || {}).map(([uci, ms]) => ({ uci, games: ms.games || 0 }));
      if (!entries.length) break;
      entries.sort((a,b)=> b.games - a.games);
      const u = entries[0].uci;
      out.push(u);
      const res = d.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u.slice(4) || undefined } as any);
      if (!res) break;
    }
  } catch {}
  return out;
}
