"use client";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Box, Button, CircularProgress, Divider, Paper, Stack, TextField, Typography, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, Chip, Alert, Slider, Accordion, AccordionSummary, AccordionDetails, Snackbar } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Chess } from "chess.js";
import { atom, useAtom } from "jotai";
import Board from "@/src/components/board";
import { Color } from "@/src/types/enums";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PreviewRoundedIcon from '@mui/icons-material/PreviewRounded';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import Link from 'next/link';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useChessActions } from "@/src/hooks/useChessActions";
import MiniBook from "./components/MiniBook";
import ModelGames from "./components/ModelGames";
import { logEvent } from "@/src/lib/telemetry";

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
  const [fenError, setFenError] = useState<string | null>(null);
  const [index, setIndex] = useState<Map<Fen4, Node> | null>(null);
  const [fileKey, setFileKey] = useState<string>('lichess-4000.pgn');
  const [fromCache, setFromCache] = useState<string | null>(null);
  const [indexSource, setIndexSource] = useState<'prebuilt'|'stream'|'cache'|null>(null);
  const [manifestMeta, setManifestMeta] = useState<any>(null);

  // UI states
  const [sortKey, setSortKey] = useState<'hot'|'win'>('hot');
  const [preview, setPreview] = useState<{ active: boolean; baseFen?: string; line?: string[]; startUci?: string; idx?: number; playing?: boolean }>({ active: false });
  const [fallbackInfo, setFallbackInfo] = useState<{ type: 'fen4'|'fen2'|'ancestor'|'none'; depth?: number }>({ type: 'none' });
  const [trainingQueueSize, setTrainingQueueSize] = useState<number>(() => getTrainingQueue().length);
  const [snack, setSnack] = useState<{ open: boolean; message: string; action?: React.ReactNode }>(() => ({ open: false, message: '' }));
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [practiceCount, setPracticeCount] = useState<number>(5);

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
  useEffect(() => {
    const onUnload = () => { try { const { flushTelemetry } = require('@/src/lib/telemetry'); flushTelemetry(); } catch {} };
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', onUnload);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onUnload); };
  }, []);

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
    try {
      const norm = normalizeFenInput(fen);
      const d = new Chess(norm);
      setGame(d);
      setFenError(null);
    } catch {
      setFenError('Invalid FEN. Please paste a full 6-field FEN.');
    }
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

  const eventCtx = useCallback(() => ({ fen4: fen4(game.fen()), source: indexSource, sortKey, fallback: fallbackInfo?.type, fallbackDepth: fallbackInfo?.depth, queueSize: getTrainingQueue().length }), [game, indexSource, sortKey, fallbackInfo]);

  const onPracticeNow = useCallback((count: number): number => {
    if (!index) return 0;
    try {
      const pv = buildGreedyPv(game.fen(), index, Math.max(1, Math.min(50, count)));
      const tasks: Array<{ fen: string; acceptedUci: string[]; createdAt: number }> = [];
      let d = new Chess(game.fen());
      for (let i = 0; i < pv.length && tasks.length < count; i++) {
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
        logEvent('practice_now', { page: 'explore', ...eventCtx(), add: tasks.length, after: q.length });
        return tasks.length;
      }
    } catch (e) { console.warn('[PracticeNow] failed', e); }
    return 0;
  }, [index, game, eventCtx]);

  const onStartPractice = useCallback(() => {
    try {
      const q = getTrainingQueue();
      if (!q.length) { onPracticeNow(practiceCount); return; }
      const first = q[0];
      const payload = { fen: first.fen, acceptedUci: first.acceptedUci, attempts: 3 };
      localStorage.setItem('analyze:startup', JSON.stringify(payload));
      logEvent('practice_start', { page: 'explore', ...eventCtx(), queue: q.length });
      location.href = '/analyze';
    } catch (e) { console.warn('[StartPractice] failed', e); }
  }, [onPracticeNow, eventCtx, practiceCount]);

  const removeLastFromQueue = useCallback((n: number): number => {
    try {
      const q = getTrainingQueue();
      if (!Array.isArray(q) || q.length === 0) return 0;
      const remove = Math.min(Math.max(1, n), q.length);
      q.splice(q.length - remove, remove);
      localStorage.setItem('explore:trainingQueue', JSON.stringify(q));
      setTrainingQueueSize(q.length);
      return remove;
    } catch { return 0; }
  }, []);

  const showSnack = useCallback((message: string, action?: React.ReactNode) => {
    setSnack({ open: true, message, action });
  }, []);

  // Stable player objects (avoid re-creating each render to prevent Board effects from looping)
  const whitePlayer = useMemo(() => ({ name: 'White' }), []);
  const blackPlayer = useMemo(() => ({ name: 'Black' }), []);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1400, mx: 'auto' }}>
      {/* HEADER SECTION */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Position Explorer
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
          Study the next moves for any position: hot choices, win rates, a mini opening tree, and model games. Add lines to your practice queue.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            size="small"
            label={`Source: ${indexSource ?? '—'}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          {!!fromCache && <Chip size="small" label={`Index: ${fromCache}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />}
          {manifestMeta?.date && <Chip size="small" label={`Updated: ${manifestMeta?.date}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />}
          {manifestMeta?.coverage && <Chip size="small" label={`Coverage: ${manifestMeta.coverage}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />}
          {Number.isFinite(Number(manifestMeta?.totalGames)) && (
            <Chip size="small" label={`Total: ${formatInt(manifestMeta?.totalGames)}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          )}
          <Chip size="small" label={`Nodes: ${formatInt(index?.size ?? 0)}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip size="small" label={`Training: ${formatInt(trainingQueueSize)}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        </Stack>
      </Paper>

      {/* MAIN TOOL SECTION */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2, bgcolor: 'background.default', backgroundImage: 'none' }}>
        <Stack spacing={3}>
          {/* FEN INPUT SECTION */}
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Analyze Position
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="FEN Position Code"
                placeholder="Paste a 6-field FEN, e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                value={fen}
                onChange={(e)=> setFen(e.target.value)}
                onKeyDown={(e)=> { if (e.key === 'Enter') { e.preventDefault(); onApplyFen(); } }}
                error={!!fenError}
                helperText={fenError || 'Press Enter to apply. FEN is a standardized code for chess positions.'}
                InputProps={{
                  endAdornment: (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip title="What is FEN? A standardized 6-field code for chess positions.">
                        <IconButton size="small">
                          <HelpOutlineOutlinedIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )
                }}
              />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  onClick={onApplyFen}
                  startIcon={<PlayArrowRoundedIcon />}
                >
                  Apply FEN
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={()=> { try { const f = game.fen(); setFen(f); setFenError(null); } catch {} }}
                >
                  Use Current Board
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  Quick examples:
                </Typography>
                {['e2e4','d2d4','c2c4','g1f3'].map((u)=> (
                  <Button
                    key={u}
                    size="small"
                    variant="text"
                    onClick={()=> applyExampleMove(u, setFen, onApplyFen)}
                  >
                    {uciToSan(new Chess().fen(), u)}
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Stack>

          {/* DATASET AND ACTIONS */}
          <Divider />
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Dataset & Actions
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Dataset:
                </Typography>
                <Button
                  size="small"
                  variant={fileKey === 'lichess-4000.pgn' ? 'contained' : 'outlined'}
                  onClick={()=> setFileKey('lichess-4000.pgn')}
                >
                  4000+
                </Button>
                <Button
                  size="small"
                  variant={fileKey === 'lichess-2025-08-2000.pgn' ? 'contained' : 'outlined'}
                  onClick={()=> setFileKey('lichess-2025-08-2000.pgn')}
                >
                  2000 (AUG)
                </Button>
                <Button
                  size="small"
                  variant={fileKey === 'lichess-2000.pgn' ? 'contained' : 'outlined'}
                  onClick={()=> setFileKey('lichess-2000.pgn')}
                >
                  2000
                </Button>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                onClick={()=> buildIndex(true)}
                startIcon={<RestartAltIcon />}
              >
                Rebuild Index
              </Button>
            </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
            >
              <Button
                fullWidth
                size="large"
                variant="contained"
                color="success"
                onClick={() => {
                  if (practiceBusy) return;
                  setPracticeBusy(true);
                  const added = onPracticeNow(practiceCount) || 0;
                  setPracticeBusy(false);
                  if (added > 0) {
                    showSnack(`Added ${added} drill${added>1?'s':''} to training queue`, (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" color="inherit" onClick={onStartPractice}>Start Now</Button>
                        <Button size="small" color="inherit" onClick={()=> location.href='/train'}>View Queue</Button>
                        <Button size="small" color="inherit" onClick={()=> { const r = removeLastFromQueue(added); showSnack(r>0?`Undid ${r} drill${r>1?'s':''}`:'Nothing to undo'); }}>Undo</Button>
                      </Stack>
                    ));
                  } else {
                    showSnack('No drills were generated for this position. Try a different position.');
                  }
                }}
                startIcon={<AddTaskRoundedIcon />}
              >
                {practiceBusy ? 'Working…' : `Practice Now (${practiceCount})`}
              </Button>
              <Button
                fullWidth
                size="large"
                variant="outlined"
                onClick={onStartPractice}
                startIcon={<PlayArrowRoundedIcon />}
              >
                Start Practice
              </Button>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={String(practiceCount)}
                onChange={(_, v)=> v && setPracticeCount(Number(v))}
                sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
              >
                <ToggleButton value="5">5</ToggleButton>
                <ToggleButton value="10">10</ToggleButton>
                <ToggleButton value="20">20</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          {/* LOADING & STATUS SECTION */}
          {loading && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: 'background.default',
                border: '1px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                textAlign: 'center',
                backgroundImage: 'none'
              }}
            >
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Building Position Index
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress}
              </Typography>
            </Paper>
          )}

          {err && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
              {err}
            </Alert>
          )}

          {fromCache && (
            <Alert severity="success" variant="outlined" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 2 }}>
              Loaded from {indexSource} · {fromCache}
            </Alert>
          )}

          {(fallbackInfo.type !== 'fen4') && (
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon />}
              sx={{ borderRadius: 2 }}
            >
              {fallbackInfo.type === 'fen2' && 'No data for FEN-4. Showing aggregated FEN-2 stats.'}
              {fallbackInfo.type === 'ancestor' && `Fell back to the nearest ancestor with data (${fallbackInfo.depth} plies earlier).`}
              {fallbackInfo.type === 'none' && 'No data found. Try stepping back a half-move or start from an example e4/d4/c4/Nf3.'}
            </Alert>
          )}

          {/* CHESS BOARD & ANALYSIS SECTION */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
            {/* CHESS BOARD */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                flex: { xs: '1 1 auto', lg: '0 0 480px' },
                display: 'flex',
                justifyContent: 'center',
                borderRadius: 2
              }}
            >
              <Board
                id="explore"
                canPlay={!preview.active}
                gameAtom={activeGameAtom}
                boardOrientation={Color.White}
                whitePlayer={whitePlayer}
                blackPlayer={blackPlayer}
                showEvaluationBar={false}
                extraArrows={computePreviewArrows(preview)}
              />
            </Paper>

            {/* ANALYSIS PANEL */}
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                minWidth: 0,
                bgcolor: 'background.default'
                , backgroundImage: 'none' 
              }}
            >
              <Stack spacing={3}>
                {/* TOP MOVES SECTION */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Top Moves
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      value={sortKey}
                      exclusive
                      onChange={(_,v)=> v && setSortKey(v)}
                    >
                      <ToggleButton value="hot">
                        <SortRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        Hot
                      </ToggleButton>
                      <ToggleButton value="win">Win%</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  {topMoves.length > 0 ? (
                    <Stack spacing={1}>
                      {topMoves.map((m, i) => (
                        <Paper
                          key={i}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            bgcolor: 'background.default',
                            backgroundImage: 'none',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'action.hover',
                              transform: 'translateX(2px)'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                fontWeight: 700
                              }}
                            >
                              {i + 1}
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                                {m.san || m.uci}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {m.games.toLocaleString()} games
                                {typeof m.win === 'number' ? ` · ${Math.round(m.win * 100)}%` : ' · —'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Play this move">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={()=> onPlayMove(m.uci, game.fen(), playMove)}
                              >
                                <PlayArrowRoundedIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Preview 10 plies">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={()=> onPreviewMoveInline(m.uci, game.fen(), index, setPreview)}
                              >
                                <PreviewRoundedIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Add to Training">
                              <IconButton
                                size="small"
                                onClick={()=> { onAddToTraining(game.fen(), [m.uci], setTrainingQueueSize); showSnack('Added 1 drill to training queue', (
                                  <Stack direction='row' spacing={1}>
                                    <Button size='small' color='inherit' onClick={onStartPractice}>Start</Button>
                                    <Button size='small' color='inherit' onClick={()=> location.href='/train'}>View</Button>
                                    <Button size='small' color='inherit' onClick={()=> { const r = removeLastFromQueue(1); showSnack(r>0?'Undid 1 drill':'Nothing to undo'); }}>Undo</Button>
                                  </Stack>
                                )); }}
                              >
                                <AddTaskRoundedIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: 'background.default'
                , backgroundImage: 'none' ,
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No data for this position. Try switching dataset or using a different FEN.
                      </Typography>
                    </Paper>
                  )}
                    </Stack>
                </Paper>

                {/* MINI BOOK SECTION */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Mini Book
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <MiniBook
                        indexMap={index || new Map()}
                        rootFen={game.fen()}
                        depth={2}
                        topN={3}
                        onMove={(uci)=> onPlayMove(uci, game.fen(), playMove)}
                      />
                    </Paper>
                  </Stack>
                </Paper>

                {/* MODEL GAMES SECTION */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ModelGames indexMap={index || new Map()} rootFen={game.fen()} />
                </Paper>

                {/* PREVIEW SECTION */}
                {preview.active && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Preview Mode
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={()=> previewClose(setPreview, previewTimerRef)}
                      >
                        <CloseRoundedIcon fontSize='small' />
                      </IconButton>
                    </Stack>

                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Previous">
                          <IconButton
                            size="small"
                            onClick={()=> previewStep(preview, -1, setPreview, resetPreviewBoard, addMovesToPreview)}
                          >
                            <SkipPreviousRoundedIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={preview.playing ? 'Pause' : 'Play'}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={()=> previewToggle(preview, setPreview, previewTimerRef, resetPreviewBoard, addMovesToPreview)}
                          >
                            {preview.playing ? <PauseRoundedIcon fontSize='small'/> : <PlayArrowRoundedIcon fontSize='small'/>}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Next">
                          <IconButton
                            size="small"
                            onClick={()=> previewStep(preview, 1, setPreview, resetPreviewBoard, addMovesToPreview)}
                          >
                            <SkipNextRoundedIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Replay from start">
                          <IconButton
                            size="small"
                            onClick={()=> previewReplay(preview, resetPreviewBoard, addMovesToPreview, previewTimerRef)}
                          >
                            <RestartAltIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Apply to board (Enter)">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={()=> previewApply(preview, addMoves, setPreview)}
                            startIcon={<PlayArrowRoundedIcon fontSize='small' />}
                          >
                            Apply
                          </Button>
                        </Tooltip>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ width: 50, textAlign: 'right' }}>
                          {Math.min(preview.idx||0, (preview.line?.length||0))}/{preview.line?.length||0}
                        </Typography>
                        <Slider
                          size="small"
                          min={0}
                          max={(preview.line?.length||0)}
                          value={Math.min(preview.idx||0, (preview.line?.length||0))}
                          onChange={(_,v)=> previewSeekTo(preview, Number(v), setPreview, resetPreviewBoard, addMovesToPreview)}
                          sx={{ flex: 1 }}
                        />
                      </Stack>

                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          bgcolor: 'background.paper',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}
                      >
                        {(preview.line||[]).join(' ') || '—'}
                      </Paper>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {/* DOCUMENTATION & FAQ SECTION */}
      <Box
        sx={{
          mt: 4,
          p: { xs: 0, md: 1 },
          bgcolor: 'background.default'
                , backgroundImage: 'none' ,
          borderRadius: 2
        }}
      >
        <Stack spacing={4}>
          {/* HERO INTRODUCTION */}
          <Paper
            elevation={1}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography
              component="h2"
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Why This Position Explorer Matters for Chess Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              This page is built for chess analysis. It lets you explore real-game move choices from large open datasets and see which lines perform best. Compared with a pure engine, data‑driven chess analysis helps you understand what humans actually play online and over‑the‑board, and which practical options score well in real games.
            </Typography>
          </Paper>

          {/* FEATURE GRID */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                flex: 1,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'primary.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <SortRoundedIcon color="primary" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Key Features
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                <Typography variant="body2">✓ Top moves with games and win rates to power your chess analysis decisions.</Typography>
                <Typography variant="body2">✓ Mini book tree to preview lines quickly (no engine required).</Typography>
                <Typography variant="body2">✓ Model games you can open in the Analyzer for deeper chess analysis with Stockfish.</Typography>
                <Typography variant="body2">✓ Practice queue to convert findings into drills in one click.</Typography>
              </Stack>
            </Paper>

            <Paper
              elevation={1}
              sx={{
                p: 3,
                flex: 1,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'secondary.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <InfoOutlinedIcon color="secondary" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Who Is It For
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                <Typography variant="body2">✓ Players who want free chess analysis without sign‑in.</Typography>
                <Typography variant="body2">✓ Opening learners who need a fast, data‑first view before engine analysis.</Typography>
                <Typography variant="body2">✓ Coaches preparing model lines and practice tasks for students.</Typography>
              </Stack>
            </Paper>
          </Stack>

          {/* HOW IT WORKS */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="h3" variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              How It Works
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
              We aggregate real games into a lightweight index. When you paste a FEN above, the explorer locates the position and shows the most played continuations. You can preview a line, add it to practice, or open a model game in the full Analyzer. For engine‑powered chess analysis, head to{' '}
              <Button component={Link} href="/analyze" size="small" sx={{ verticalAlign: 'baseline' }}>
                /analyze
              </Button>{' '}
              where Stockfish provides multi‑PV evaluations.
            </Typography>
          </Paper>

          {/* QUICK START GUIDE */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="h3" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Quick Start Guide
            </Typography>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  1
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Paste a FEN position
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paste a FEN above (or click an example) and press Apply to analyze any chess position.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  2
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Review top moves
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Scan Top Moves: higher games = more popular; higher win% = better results.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  3
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Preview the line
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Preview a move to see how the line unfolds; use the playback controls to step through.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  4
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Practice or analyze deeper
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open a model game in the Analyzer for engine‑based chess analysis, or add to practice queue.
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {/* STATS GUIDE */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="h3" variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              How To Read The Statistics
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  📊 Games
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sample size for that move from real games (higher = more reliable).
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  🎯 Win%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expected result for the side to move in this position (computed from results).
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  🌳 Mini Book
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A compact tree to sense the next 1–2 moves and typical plans.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* PRACTICE SECTION */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="h3" variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Practice In 30 Seconds
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  1
                </Box>
                <Typography variant="body2">
                  Click <b>Practice Now (5)</b> to auto‑create five drills from the current position
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  2
                </Box>
                <Typography variant="body2">
                  Hit <b>Start Practice</b> to jump into retry mode and test yourself
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  3
                </Box>
                <Typography variant="body2">
                  Repeat for your favorite openings until the moves feel automatic
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* COVERAGE & LIMITS */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="h3" variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Coverage & Limitations
            </Typography>
            <Stack spacing={1.5}>
              <Typography variant="body2">⚠️ Data comes from real games. Small samples can be noisy—prefer higher game counts.</Typography>
              <Typography variant="body2">⚠️ When a specific FEN is missing, we fall back to FEN‑2 or a recent ancestor and label it.</Typography>
              <Typography variant="body2">⚠️ Use engine analysis for sharp tactics or when results disagree across sources.</Typography>
            </Stack>
          </Paper>

          {/* WHY PLAYERS LIKE IT */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Why players love this tool
            </Typography>
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ color: 'white' }}>✓ Data‑first chess analysis: see what people actually play and what succeeds.</Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>✓ Fast previews and a clean opening tree for immediate understanding.</Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>✓ One‑click flow to engine analysis and practice—no accounts, free to use.</Typography>
            </Stack>
          </Paper>

          {/* FAQ SECTION */}
          <Paper
            elevation={1}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="h3" variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
              Frequently Asked Questions
            </Typography>
            <Stack spacing={1.5}>
              <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>
                    Is this a chess analysis engine or a database?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">
                    It is a data‑driven explorer. For engine chess analysis, open a position here and then use our Analyzer page with Stockfish. Together they create a complete chess analysis workflow.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>Is it free to use?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">
                    Yes. The position explorer and the Analyzer provide free chess analysis features. No sign‑in is required.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>
                    How does this compare to lichess analysis or chess.com analysis?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">
                    We focus on a quick, practical view of what players choose in real games. Use this explorer to see popular and successful moves, then use the Analyzer for deep engine‑based chess analysis. It complements lichess analysis and chess.com analysis by giving you a data‑first starting point.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>Can I practice the lines I find?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">
                    Yes. Add top moves to your practice queue and start training in one click. It turns chess analysis into spaced practice.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </Paper>
        </Stack>

        {/* ACTION BUTTONS */}
        <Paper
          elevation={1}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
          >
            <Button
              component={Link}
              href="/analyze"
              variant="contained"
              size="large"
              startIcon={<PlayArrowRoundedIcon />}
              sx={{ flex: 1 }}
            >
              Open Chess Analyzer
            </Button>
            <Button
              component={Button}
              onClick={(e:any)=>{ e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              variant="outlined"
              size="large"
              startIcon={<RestartAltIcon />}
              sx={{ flex: 1 }}
            >
              Back to Top
            </Button>
          </Stack>
        </Paper>
      </Box>
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
        action={snack.action}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
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
    logEvent('play_click', { page: 'explore', uci, fen4: fen4(fen) });
  } catch {}
}

function onAddToTraining(fen: string, acceptedUci: string[], setSize: (n:number)=>void) {
  const q = getTrainingQueue();
  q.push({ fen, acceptedUci, createdAt: Date.now() });
  try { localStorage.setItem('explore:trainingQueue', JSON.stringify(q)); } catch {}
  setSize(q.length);
  logEvent('add_to_training', { page: 'explore', fen4: fen4(fen), acceptedUci });
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
    setPreview({ active: true, baseFen: rootFen, line: lineSAN, startUci, idx: 0, playing: false });
    logEvent('preview_click', { page: 'explore', startUci, len: lineSAN.length, fen4: fen4(rootFen) });
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

// Step/seek/play helpers for preview
function previewResetToIdx(preview: any, idx: number, resetPreviewBoard: (opts:any)=>void, addMovesToPreview: (moves: string[])=>void) {
  if (!preview?.active || !preview?.baseFen || !Array.isArray(preview.line)) return;
  const clamp = Math.max(0, Math.min(idx, preview.line.length));
  resetPreviewBoard({ fen: preview.baseFen, noHeaders: true });
  const first = preview.line.slice(0, clamp);
  if (first.length) addMovesToPreview(first);
}

function previewSeekTo(preview: any, idx: number, setPreview: (p:any)=>void, resetPreviewBoard: (opts:any)=>void, addMovesToPreview: (moves: string[])=>void) {
  previewResetToIdx(preview, idx, resetPreviewBoard, addMovesToPreview);
  setPreview({ ...preview, idx, playing: false });
}

function previewStep(preview: any, delta: number, setPreview: (p:any)=>void, resetPreviewBoard: (opts:any)=>void, addMovesToPreview: (moves: string[])=>void) {
  const next = Math.max(0, Math.min((preview.idx||0) + delta, (preview.line?.length||0)));
  previewSeekTo(preview, next, setPreview, resetPreviewBoard, addMovesToPreview);
}

function previewToggle(preview: any, setPreview: (p:any)=>void, timerRef: any, resetPreviewBoard: (opts:any)=>void, addMovesToPreview: (moves: string[])=>void) {
  if (!preview?.active || !Array.isArray(preview.line)) return;
  if (preview.playing) {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPreview({ ...preview, playing: false });
    return;
  }
  // start playing from current idx
  const startIdx = Math.max(0, Math.min(preview.idx || 0, preview.line.length));
  // Reset and play progressively
  previewResetToIdx(preview, startIdx, resetPreviewBoard, addMovesToPreview);
  setPreview({ ...preview, playing: true });
  let i = startIdx;
  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  timerRef.current = setInterval(() => {
    i++;
    if (i > preview.line.length) { clearInterval(timerRef.current); timerRef.current = null; setPreview((p:any)=> ({ ...p, playing: false, idx: preview.line.length })); return; }
    previewResetToIdx(preview, i, resetPreviewBoard, addMovesToPreview);
    setPreview((p:any)=> ({ ...p, idx: i }));
  }, 350);
}

function computePreviewArrows(preview: any): Array<{ startSquare: string; endSquare: string; color?: string }> {
  try {
    if (!preview?.active || !preview?.baseFen || !Array.isArray(preview.line)) return [];
    const idx = Math.max(0, Math.min(preview.idx || 0, preview.line.length));
    if (idx >= preview.line.length) return [];
    const currentFen = fenAfter(preview.baseFen, preview.line.slice(0, idx));
    const nextSan = preview.line[idx];
    const move = sanToMove(currentFen, nextSan);
    if (!move) return [];
    return [{ startSquare: move.from, endSquare: move.to, color: '#33a3ff' }];
  } catch { return []; }
}

function fenAfter(base: string, sans: string[]): string {
  try {
    const d = new Chess(base);
    for (const s of sans) { try { d.move(s); } catch { break; } }
    return d.fen();
  } catch { return base; }
}

function sanToMove(fen: string, san: string): { from: string; to: string } | null {
  try {
    const d = new Chess(fen);
    const res = d.move(san);
    if (!res) return null;
    return { from: res.from, to: res.to } as any;
  } catch { return null; }
}

function formatInt(n: any): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n ?? '0');
  return v.toLocaleString();
}

// Accepts full FEN; also accepts partial FEN (2 or 4 fields) by auto-filling the rest conservatively
function normalizeFenInput(raw: string): string {
  const s = (raw || '').trim().replace(/\s+/g, ' ');
  const parts = s.split(' ');
  if (parts.length >= 6) return parts.slice(0,6).join(' ');
  if (parts.length === 4) return `${parts[0]} ${parts[1]} ${parts[2] || '-'} ${parts[3] || '-'} 0 1`;
  if (parts.length === 2) return `${parts[0]} ${parts[1]} - - 0 1`;
  // If only placement provided, assume white to move
  if (parts.length === 1 && parts[0].includes('/')) return `${parts[0]} w - - 0 1`;
  return s; // let chess.js validate and throw
}
