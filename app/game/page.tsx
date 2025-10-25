"use client";
/**
 * Game page – Material UI version.
 * - Keeps the engine logic but rebuilds visual layout with MUI components.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess, Square } from "chess.js";
import { useStockfish } from "../hooks/useStockfish";
import { useStockfishPool } from "../hooks/useStockfishPool";
import { getEvaluateGameParams, moveLineUciToSan } from "@/src/lib/chess";
import { computeAccuracy } from "@/src/lib/engine/helpers/accuracy";
import { computeEstimatedElo } from "@/src/lib/engine/helpers/estimateElo";
import { getMovesClassification } from "@/src/lib/engine/helpers/moveClassification";
import type { PositionEval } from "@/src/types/eval";
import { getCachedEval, setCachedEval } from "@/src/services/fenCache";
import { Box, Stack, Paper, Typography, Divider, Button, IconButton, Tooltip, Slider, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, OutlinedInput, Select, MenuItem, TextField, Table, TableHead, TableRow, TableCell, TableBody, Chip } from "@mui/material";
import EngineLinesPanel from "./panels/EngineLines";
import GraphMini from "./panels/GraphMini";
import MoveList from "./panels/MoveList";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

type Piece = ReturnType<Chess["get"]>;

function formatScore(score?: number, mate?: number) {
  if (typeof mate === "number") {
    const m = Math.abs(mate);
    const sign = mate > 0 ? "" : mate < 0 ? "-" : "";
    return `${sign}M${m}`;
  }
  if (typeof score === "number") return (score / 100).toFixed(2);
  return "N/A";
}

// Resolve piece image from public/piece/chicago set
function pieceSrc(p?: Piece): string | null {
  if (!p) return null;
  const prefix = p.color === 'w' ? 'w' : 'b';
  const code = { p: 'P', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' }[p.type];
  if (!code) return null;
  return `/piece/chicago/${prefix}${code}.svg`;
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function GameInner() {
  const searchParams = useSearchParams();
  const pgnParam = searchParams?.get("pgn") || undefined;

  // Core chess state
  const [game, setGame] = useState<Chess>(() => new Chess());
  // basePgn: current board PGN (may change if用户点棋盘走子)
  const [basePgn, setBasePgn] = useState<string | undefined>(undefined);
  // analyzedPgnRef: 本次分析的“固定PGN”（用于时间轴与左右箭头的权威来源，不随交互改变）
  const analyzedPgnRef = useRef<string | undefined>(undefined);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  // Engine
  const { isReady, analyzePreferCloud, info, lines, setEngineVariant, setThreads, setMultiPv, multiPv } = useStockfish();
  const lastFenRef = useRef<string>("");
  const [ply, setPly] = useState<number>(0); // 0..total plies
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Full-game analysis state for key moments
  const [series, setSeries] = useState<{ ply: number; cp: number; mate?: number }[]>([]);
  const [keyMoments, setKeyMoments] = useState<number[]>([]);
  const [currentKeyIdx, setCurrentKeyIdx] = useState<number>(-1);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [engineDepth, setEngineDepth] = useState(18);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<{ variant: string; threads: number; depth: number; mpv: number; workers: number }>(() => ({ variant: 'sf17-lite', threads: 2, depth: 18, mpv: 3, workers: 2 }));
  const pool = useStockfishPool();
  const [accuracySummary, setAccuracySummary] = useState<{ white: number; black: number } | undefined>(undefined);
  const [estimatedElo, setEstimatedEloSummary] = useState<{ white: number; black: number } | undefined>(undefined);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [moveSummaries, setMoveSummaries] = useState<Array<{ ply: number; san: string; color: 'w'|'b'; cls: MoveClass; delta: number; bestSan?: string; bestUci?: string; playedUci?: string }>>([]);
  const [previewArrow, setPreviewArrow] = useState<{ from: string; to: string } | null>(null);
  const [previewMarker, setPreviewMarker] = useState<{ square: string; cls: MoveClass } | null>(null);
  const [classCountsByColor, setClassCountsByColor] = useState<{ w: Record<string, number>; b: Record<string, number> }>({ w: {}, b: {} });
  const [qualityCountsByColor, setQualityCountsByColor] = useState<{ w: Record<string, number>; b: Record<string, number> }>({ w: {}, b: {} });
  const [headerInfo, setHeaderInfo] = useState<{ white?: string; black?: string; result?: string; date?: string; site?: string }>({});
  const [openingInfo, setOpeningInfo] = useState<{ eco?: string; name?: string } | undefined>(undefined);
  // Move annotations and last-move highlight
  type MoveClass = 'Splendid' | 'Perfect' | 'Excellent' | 'Best' | 'Okay' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  interface EvalLike { score?: number; mate?: number }
  interface MoveAnnotation { ply: number; san: string; color: 'w'|'b'; pre?: EvalLike; post?: EvalLike; delta?: number; classification?: MoveClass; fenAfter?: string }
  const [annotations, setAnnotations] = useState<MoveAnnotation[]>([]);
  const pendingAnnotationRef = useRef<MoveAnnotation | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  // Simple PGN headers parser + opening detection via small book
  const parseHeaders = (pgn?: string) => {
    if (!pgn) return {} as any;
    const pick = (k: string) => pgn.match(new RegExp(`\\[${k} \"([^\"]*)\"\\]`))?.[1];
    return { white: pick('White'), black: pick('Black'), result: pick('Result'), date: pick('Date'), site: pick('Site'), opening: pick('Opening'), eco: pick('ECO') } as any;
  };
  type OpeningPattern = { eco: string; name: string; pattern: string[] };
  const BUILTIN_OPENINGS: OpeningPattern[] = [
    { eco: 'B20', name: 'Sicilian Defence', pattern: ['e2e4','c7c5'] },
    { eco: 'C00', name: 'French Defence', pattern: ['e2e4','e7e6'] },
    { eco: 'B10', name: 'Caro-Kann Defence', pattern: ['e2e4','c7c6'] },
    { eco: 'C50', name: 'Italian Game', pattern: ['e2e4','e7e5','g1f3','b8c6','f1c4'] },
    { eco: 'C60', name: 'Ruy Lopez', pattern: ['e2e4','e7e5','g1f3','b8c6','f1b5'] },
    { eco: 'D06', name: "Queen's Gambit", pattern: ['d2d4','d7d5','c2c4'] },
    { eco: 'E60', name: "King's Indian Defence", pattern: ['d2d4','g8f6','c2c4','g7g6'] },
    { eco: 'A20', name: 'English Opening', pattern: ['c2c4'] },
    { eco: 'A04', name: 'Reti Opening', pattern: ['g1f3'] },
    { eco: 'B01', name: 'Scandinavian Defence', pattern: ['e2e4','d7d5'] },
    { eco: 'E20', name: 'Nimzo-Indian Defence', pattern: ['d2d4','g8f6','c2c4','e7e6','b1c3','f8b4'] },
  ];
  const [ecoBook, setEcoBook] = useState<OpeningPattern[] | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch('/eco.json').then(r => r.ok ? r.json() : null).then((json) => {
      if (!mounted || !json) return;
      try {
        const items = (json as any[]).map(it => ({ eco: it.eco, name: it.name, pattern: (it.uci || it.pattern || []) as string[] })) as OpeningPattern[];
        if (items?.length) setEcoBook(items);
      } catch {}
    }).catch(()=>{});
    return () => { mounted = false; };
  }, []);

  const detectOpening = (uci: string[], pgn?: string) => {
    const hdr = parseHeaders(pgn);
    if (hdr.opening || hdr.eco) return { eco: hdr.eco, name: hdr.opening };
    let match: OpeningPattern | undefined; let len = 0;
    const book = ecoBook || BUILTIN_OPENINGS;
    for (const op of book) {
      const ok = op.pattern.every((m,i)=> uci[i]===m);
      if (ok && op.pattern.length>len) { match=op; len=op.pattern.length; }
    }
    return match ? { eco: match.eco, name: match.name } : undefined;
  };

  // Load PGN if provided
  useEffect(() => {
    const next = new Chess();
    try {
      if (pgnParam) next.loadPgn(pgnParam);
    } catch {}
    setGame(next);
    setBasePgn(next.pgn());
    analyzedPgnRef.current = next.pgn();
    setPly(next.history().length);
    setHeaderInfo(parseHeaders(next.pgn()));
  }, [pgnParam]);

  // Trigger evaluation when FEN changes
  useEffect(() => {
    const fen = game.fen();
    if (fen && fen !== lastFenRef.current) {
      lastFenRef.current = fen;
      analyzePreferCloud(fen, engineDepth, settings.mpv);
    }
  }, [game, analyzePreferCloud, engineDepth, settings.mpv]);

  // Auto-run analysis when URL has auto=1 and PGN is provided
  useEffect(() => {
    const auto = searchParams?.get('auto');
    // 等待 PGN 已成功载入到 game（至少一手），再触发自动全局分析
    if (!auto) return;
    if (!pgnParam) return;
    if (analyzing || series.length > 0) return;
    if (game.history().length === 0) return;
    analyzeFullGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgnParam, game, analyzing, series.length]);

  const files = useMemo(() => ["a","b","c","d","e","f","g","h"], []);
  const ranks = useMemo(() => ["8","7","6","5","4","3","2","1"], []);

  const shownFiles = flipped ? [...files].reverse() : files;
  const shownRanks = flipped ? [...ranks].reverse() : ranks;

  const onSquare = (sq: string) => {
    if (selected) {
      try {
        const moves = game.moves({ square: selected as Square, verbose: true });
        if (moves.find((m: any) => m.to === sq)) {
          const next = new Chess(game.fen());
          // Capture mover color and pre-eval before making the move
          const moverColor: 'w'|'b' = next.turn();
          next.move({ from: selected as Square, to: sq as Square, promotion: "q" });
          setGame(next);
          // 不更新 basePgn/analyzedPgnRef，避免打乱已加载对局的“时间轴”
          setPly(next.history().length);
          // Build pending annotation and record last move
          try {
            const hist = next.history({ verbose: true });
            const last = hist[hist.length - 1];
            const ann: MoveAnnotation = {
              ply: hist.length,
              san: last?.san ?? `${selected}-${sq}`,
              color: moverColor,
              pre: info ? { score: info.score, mate: info.mate } : undefined,
              fenAfter: next.fen(),
            };
            pendingAnnotationRef.current = ann;
            setAnnotations((prev)=> [...prev, ann]);
          } catch {}
          setLastMove({ from: selected, to: sq });
          setSelected(null);
          setValidMoves([]);
          return;
        }
      } catch {}
    }
    setSelected(sq);
    try {
      const ms = game.moves({ square: sq as Square, verbose: true });
      setValidMoves(ms.map((m: any) => m.to));
    } catch { setValidMoves([]); }
  };

  // Eval bar position (0..100, 100 means White winning like the screenshot's top/bottom)
  const evalPercent = useMemo(() => {
    if (typeof info?.mate === "number") return info.mate > 0 ? 98 : 2;
    if (typeof info?.score === "number") return clamp(50 + info.score / 10, 0, 100);
    return 50;
  }, [info]);

  // Classification helper
  const classifyDelta = (deltaCp: number): MoveClass => {
    if (deltaCp >= -20) return 'Best';
    if (deltaCp >= -80) return 'Good';
    if (deltaCp >= -200) return 'Inaccuracy';
    if (deltaCp >= -400) return 'Mistake';
    return 'Blunder';
  };

  // Finalize pending annotation when new info arrives for latest FEN
  useEffect(() => {
    const pending = pendingAnnotationRef.current;
    if (!pending || !info) return;
    // Map cp/mate to centipawns for mover perspective
    const toCp = (s?: number, m?: number): number | undefined => {
      if (typeof m === 'number') return m > 0 ? 100000 : -100000;
      return typeof s === 'number' ? s : undefined;
    };
    const preCp = toCp(pending.pre?.score, pending.pre?.mate);
    const postRaw = toCp(info.score, info.mate);
    const postCp = typeof postRaw === 'number' ? -postRaw : undefined; // invert perspective
    if (typeof preCp === 'number' && typeof postCp === 'number') {
      const delta = postCp - preCp;
      const cls = classifyDelta(delta);
      setAnnotations((prev) => {
        const next = prev.slice();
        const idx = next.findIndex((a) => a.ply === pending.ply && a.san === pending.san);
        if (idx !== -1) next[idx] = { ...next[idx], post: { score: info.score, mate: info.mate }, delta, classification: cls };
        return next;
      });
      pendingAnnotationRef.current = null;
    }
  }, [info]);

  const classColor = (cls?: MoveClass) => {
    switch (cls) {
      case 'Best': return 'rgba(16,185,129,0.35)'; // green
      case 'Good': return 'rgba(34,197,94,0.25)';
      case 'Inaccuracy': return 'rgba(234,179,8,0.25)';
      case 'Mistake': return 'rgba(249,115,22,0.28)';
      case 'Blunder': return 'rgba(239,68,68,0.32)';
      default: return undefined;
    }
  };
  const classChipStyle = (cls?: MoveClass) => {
    switch (cls) {
      case 'Best': return { bgcolor: '#10b981', color: '#052e1c' };
      case 'Good': return { bgcolor: '#22c55e', color: '#06220f' };
      case 'Inaccuracy': return { bgcolor: '#eab308', color: '#3b2a00' };
      case 'Mistake': return { bgcolor: '#f97316', color: '#3b1300' };
      case 'Blunder': return { bgcolor: '#ef4444', color: '#3f0000' };
      default: return { bgcolor: 'transparent', color: 'transparent' };
    }
  };

  // Load PGN from file
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onLoadGame = () => fileInputRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const next = new Chess();
      next.loadPgn(text);
      setGame(next);
      setBasePgn(next.pgn());
      setPly(next.history().length);
    } catch {}
  };

  // total plies from base PGN
  const totalPlies = useMemo(() => {
    try {
      const b = new Chess();
      const src = analyzedPgnRef.current ?? basePgn;
      if (src) b.loadPgn(src);
      return b.history().length;
    } catch { return game.history().length; }
  }, [basePgn, game]);

  // Go to ply by replaying from base PGN
  const goToPly = (target: number) => {
    try {
      const src = analyzedPgnRef.current ?? basePgn;
      if (!src) return;
      const g = new Chess();
      g.loadPgn(src);
      const { fens } = getEvaluateGameParams(g);
      const idx = Math.max(0, Math.min(target, fens.length - 1));
      const replay = new Chess(fens[idx]);
      setGame(replay);
      setPly(idx);
      setSelected(null);
      setValidMoves([]);
    } catch {}
  };

  const goStart = () => goToPly(0);
  const goPrev = () => goToPly(ply - 1);
  const goNext = () => goToPly(ply + 1);
  const goEnd = () => goToPly(totalPlies);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      playTimerRef.current = null;
      return;
    }
    setIsPlaying(true);
    playTimerRef.current = setInterval(() => {
      setPly((cur) => {
        const next = cur + 1;
        if (next > totalPlies) {
          if (playTimerRef.current) clearInterval(playTimerRef.current);
          playTimerRef.current = null;
          setIsPlaying(false);
          return cur;
        }
        // move forward
        goToPly(next);
        return next;
      });
    }, 650);
  };

  // Full-game cloud-first analysis to compute key moments
  const analyzeFullGame = async () => {
    const { fens } = getEvaluateGameParams(game);
    if (!fens.length) return;
    setAnalyzing(true);
    setProgress(0);
    // 锁定本次分析的“固定PGN”
    analyzedPgnRef.current = basePgn || game.pgn();
    const out: { ply: number; cp: number; mate?: number }[] = new Array(fens.length).fill(0).map((_,i)=>({ ply: i+1, cp: 0 }));
    const pos: PositionEval[] = new Array(fens.length).fill(0).map(()=>({ lines: [] } as PositionEval));

    // Local engine pool for all positions
    const local = await pool.evaluateFensLocal(fens, { depth: settings.depth, mpv: settings.mpv, workers: settings.workers, threadsPerWorker: Math.max(1, Math.min(32, settings.threads)), variant: settings.variant as any, onProgress: (done)=> setProgress(Math.round(done / fens.length * 100)) });
    for (let i = 0; i < fens.length; i++) {
      const fen = fens[i];
      const res = local[i];
      const conv: PositionEval = { lines: (res?.lines || []).map(l => ({ pv: l.pv, depth: l.depth, multiPv: l.multiPv, cp: l.cp, mate: l.mate })) };
      pos[i] = conv;
      const top = conv.lines[0];
      let cp = 0; let mate: number | undefined;
      if (typeof top?.mate === 'number') { mate = top.mate; cp = mate > 0 ? 100000 : -100000; }
      else if (typeof top?.cp === 'number') { const side = fen.split(' ')[1]; cp = side === 'w' ? top.cp : -top.cp; }
      out[i] = { ply: i + 1, cp, mate };
    }
    setSeries(out);
    // mark key moments (top cp swings)
    const diffs = out.map((p, i) => i === 0 ? 0 : Math.abs(p.cp - out[i - 1].cp));
    const pairs = diffs.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d);
    const picks = pairs.filter(p => p.d >= 80).slice(0, 10).map(p => p.i);
    setKeyMoments(picks);
    setCurrentKeyIdx(picks.length ? 0 : -1);
    // accuracy/elo summary
    try { const acc = computeAccuracy(pos as any); setAccuracySummary({ white: Number(acc.white.toFixed(1)), black: Number(acc.black.toFixed(1)) }); } catch { setAccuracySummary(undefined); }
    try { const est = computeEstimatedElo(pos as any); if (est) setEstimatedEloSummary({ white: Math.round(est.white), black: Math.round(est.black) }); else setEstimatedEloSummary(undefined);} catch { setEstimatedEloSummary(undefined); }

    // per-move classification (Chesskit logic) and best-move SAN suggestion
    try {
      const { fens: allFens, uciMoves } = getEvaluateGameParams(game);
      // Ensure bestMove field is set for classification logic
      for (let i = 0; i < pos.length; i++) {
        const top = pos[i]?.lines?.[0];
        if (top?.pv?.length) (pos[i] as any).bestMove = top.pv[0];
      }
      const classified = getMovesClassification(pos as any, uciMoves, allFens);
      const base = new Chess(); base.loadPgn(basePgn || game.pgn());
      const sanList = base.history();

      const byColor: { w: Record<string, number>; b: Record<string, number> } = { w: {}, b: {} };
      const counts: Record<string, number> = {};
      const qCounts: { w: Record<string, number>; b: Record<string, number> } = { w: {}, b: {} };
      const moves: Array<{ ply: number; san: string; color: 'w'|'b'; cls: MoveClass; delta: number; bestSan?: string; bestUci?: string; playedUci?: string }> = [];

      for (let i = 0; i < uciMoves.length; i++) {
        const color: 'w'|'b' = i % 2 === 0 ? 'w' : 'b';
        const cls = (classified[i+1]?.moveClassification as any as MoveClass) || 'Best';
        counts[cls] = (counts[cls] || 0) + 1;
        byColor[color][cls] = (byColor[color][cls] || 0) + 1;

        const pv0: string | undefined = pos[i]?.lines?.[0]?.pv?.[0];
        const bestSan = pv0 ? moveLineUciToSan(allFens[i])(pv0) : undefined;
        // delta from our eval series for display only
        const pre = out[i]?.cp ?? 0; const post = out[i+1]?.cp ?? pre;
        const moverPre = color==='w'? pre : -pre; const moverPost = color==='w'? post : -post;
        const delta = moverPost - moverPre;
        moves.push({ ply: i+1, san: sanList[i] || uciMoves[i] || '', color, cls, delta, bestSan, bestUci: pv0, playedUci: uciMoves[i] });

        // map classification to quality buckets per-color similar to Chesskit colors
        const grade = (()=>{
          switch(cls){
            case 'Splendid': return 'Splendid';
            case 'Perfect': return 'Perfect';
            case 'Excellent': return 'Excellent';
            case 'Best': return 'Best';
            case 'Okay': return 'Okay';
            case 'Inaccuracy': return 'Inaccuracy';
            case 'Mistake': return 'Mistake';
            case 'Blunder': return 'Blunder';
            default: return 'Best';
          }
        })();
        qCounts[color][grade] = (qCounts[color][grade] || 0) + 1;
      }

      setClassCounts(counts);
      setClassCountsByColor(byColor);
      setMoveSummaries(moves);
      setQualityCountsByColor(qCounts);
      setOpeningInfo(detectOpening(uciMoves, basePgn || game.pgn()));
    } catch {}
    setAnalyzing(false);
  };

  const goPrevKey = () => {
    if (currentKeyIdx <= 0) return;
    const idx = currentKeyIdx - 1;
    setCurrentKeyIdx(idx);
    goToPly(keyMoments[idx]);
  };
  const goNextKey = () => {
    if (currentKeyIdx === -1 || currentKeyIdx >= keyMoments.length - 1) return;
    const idx = currentKeyIdx + 1;
    setCurrentKeyIdx(idx);
    goToPly(keyMoments[idx]);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', p: 2 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {/* Left: board side */}
          <Box sx={{ flex: 1, minWidth: 720 }}>
            {/* Top player */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'grey.900', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>B</Box>
              <Typography variant="body2">Black</Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              {/* Eval bar */}
              <Box sx={{ position: 'relative', width: 14, borderRadius: 2, overflow: 'hidden', bgcolor: 'linear-gradient(180deg, #0a0a0a, #666, #f5f5f5)' as any, background: 'linear-gradient(180deg, #0a0a0a, #666, #f5f5f5)' }}>
                <Box sx={{ position: 'absolute', left: 0, right: 0, top: `${100 - evalPercent}%` }}>
                  <Box sx={{ ml: -0.5, width: 20, height: 2, bgcolor: 'primary.main', boxShadow: '0 0 6px rgba(34,211,238,0.7)' }} />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 6, left: 4, fontSize: 10, color: 'text.secondary' }}>
                  {typeof info?.score === 'number' ? (info.score / 100).toFixed(1) : '0.0'}
                </Box>
              </Box>

              {/* Board */}
              <Box>
                {/* top files */}
                <Stack direction="row" spacing={0.5} sx={{ pl: 3.5, pr: 3.5, mb: 0.5 }}>
                  {shownFiles.map((f) => (
                    <Box key={`ft-${f}`} sx={{ width: 64, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{f}</Box>
                  ))}
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  {/* left ranks */}
                  <Stack spacing={0.5} sx={{ mr: 0.5 }}>
                    {shownRanks.map((r) => (
                      <Box key={`rl-${r}`} sx={{ width: 24, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{r}</Box>
                    ))}
                  </Stack>

                  {/* squares */}
                  <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden', position: 'relative' }}>
                    {shownRanks.map((rank) => (
                      <Stack direction="row" key={`r-${rank}`}>
                        {shownFiles.map((file) => {
                          const sq = `${file}${rank}` as Square;
                          const isLight = (file.charCodeAt(0) + rank.charCodeAt(0)) % 2 === 0;
                          const sel = selected === sq;
                          const can = validMoves.includes(sq);
                          const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
                          const lastAnn = annotations.length ? annotations[annotations.length-1] : undefined;
                          const isToSquare = lastMove?.to === sq;
                          const cls = isToSquare ? lastAnn?.classification : undefined;
                          const playedMark = previewMarker?.square === sq ? previewMarker.cls : undefined;
                          return (
                          <Box
                            key={sq}
                            component="button"
                            onClick={() => onSquare(sq)}
                            title={sq}
                            sx={{
                              width: 64,
                              height: 64,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: isLight ? '#fde68a' : '#a16207', // amber-100/700
                              outline: sel ? '2px solid' : 'none',
                              outlineColor: sel ? 'primary.main' : undefined,
                              boxShadow: 'none',
                              cursor: 'pointer',
                            }}
                          >
                              {/* Last move overlay */}
                              {isLast && (
                                <Box sx={{ position:'absolute', inset:0, background: 'rgba(59,130,246,0.15)', pointerEvents:'none' }} />
                              )}
                              {/* Classification overlay on destination square */}
                              {cls && (
                                <Box sx={{ position:'absolute', inset:0, background: classColor(cls), pointerEvents:'none' }} />
                              )}
                              {/* Classification chip */}
                              {cls && (
                                <Box sx={{ position:'absolute', top: 2, left: 2, px: 0.5, py: 0.25, borderRadius: 1, fontSize: 10, fontWeight: 700, ...classChipStyle(cls), pointerEvents:'none' }}>{cls}</Box>
                              )}
                              {/* Preview marker from Move List */}
                              {playedMark && (
                                <Box sx={{ position:'absolute', right: 4, top: 4, fontWeight:800, color: playedMark==='Blunder'? '#ef4444' : playedMark==='Mistake'? '#f97316' : '#eab308', textShadow: '0 1px 2px rgba(0,0,0,.6)', pointerEvents:'none' }}>
                                  {playedMark==='Blunder'? '!!' : playedMark==='Mistake'? '!' : '?'}
                                </Box>
                              )}
                              {/* Playable dot on legal targets */}
                              {can && (
                                <Box sx={{ position:'absolute', width: 12, height: 12, borderRadius:'50%', bgcolor:'rgba(16,185,129,.75)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none', border: '2px solid rgba(255,255,255,.7)' }} />
                              )}
                              {(() => { const src = pieceSrc(game.get(sq as Square)); return src ? (
                                // Note: using plain img for simplicity; Next/Image would need sizes
                                <img src={src} alt={sq} style={{ width: '85%', height: '85%' }} />
                              ) : null; })()}
                          </Box>
                          );
                        })}
                      </Stack>
                    ))}
                    {/* Arrow overlay drawing best move */}
                    {previewArrow && (
                      <svg width={64*8} height={64*8} viewBox={`0 0 ${64*8} ${64*8}`} style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
                            <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
                          </marker>
                        </defs>
                        {(() => { const p = previewArrow; const SQ=64;
                          const fi=(c:string)=> c.charCodeAt(0)-'a'.charCodeAt(0);
                          const ri=(r:string)=> parseInt(r,10)-1;
                          const cx = (file:number)=> flipped? (7-file)*SQ+SQ/2 : file*SQ+SQ/2;
                          const cy = (rank:number)=> flipped? rank*SQ+SQ/2 : (7-rank)*SQ+SQ/2;
                          const fx=fi(p.from[0]); const fr=ri(p.from[1]); const tx=fi(p.to[0]); const tr=ri(p.to[1]);
                          const x1=cx(fx), y1=cy(fr), x2=cx(tx), y2=cy(tr);
                          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#10b981" strokeWidth={8} markerEnd="url(#arrowhead)" strokeOpacity={0.9} />; })()}
                      </svg>
                    )}
                  </Paper>

                  {/* right ranks */}
                  <Stack spacing={0.5} sx={{ ml: 0.5 }}>
                    {shownRanks.map((r) => (
                      <Box key={`rr-${r}`} sx={{ width: 24, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{r}</Box>
                    ))}
                  </Stack>
                </Stack>

                {/* bottom files */}
                <Stack direction="row" spacing={0.5} sx={{ pl: 3.5, pr: 3.5, mt: 0.5 }}>
                  {shownFiles.map((f) => (
                    <Box key={`fb-${f}`} sx={{ width: 64, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'text.secondary' }}>{f}</Box>
                  ))}
                </Stack>
              </Box>
            </Stack>

            {/* Bottom player */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'common.white', color: 'common.black', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>W</Box>
              <Typography variant="body2">White</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>{isReady ? 'Engine Ready' : 'Loading engine…'}</Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" startIcon={<SwapVertRoundedIcon />} onClick={() => setFlipped((v) => !v)}>Flip Board</Button>
            </Stack>
          </Box>

          {/* Right side: analysis panel */}
          <Box sx={{ width: { xs: '100%', md: 520 }, maxWidth: 520, flexShrink: 0 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', minHeight: 660, display: 'flex', flexDirection: 'column', borderColor: 'primary.dark' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Game Analysis</Typography>
              </Stack>
              {(headerInfo?.white || headerInfo?.black || headerInfo?.result || openingInfo) && (
                <Stack spacing={0.5} sx={{ mb: 1 }}>
                  {(headerInfo?.white || headerInfo?.black) && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">{headerInfo.white || 'White'} vs {headerInfo.black || 'Black'}</Typography>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={2} alignItems="center">
                    {openingInfo && (
                      <Chip size="small" label={`Opening: ${openingInfo.name || '—'}${openingInfo.eco? ` (${openingInfo.eco})`:''}`} variant="outlined" />
                    )}
                    {headerInfo?.date && (
                      <Chip size="small" label={`Date: ${headerInfo.date}`} variant="outlined" />
                    )}
                    {headerInfo?.site && (
                      <Chip size="small" label={`Site: ${headerInfo.site}`} variant="outlined" />
                    )}
                    {headerInfo?.result && (
                      <Chip size="small" color="primary" label={`Result: ${headerInfo.result}`} />
                    )}
                  </Stack>
                </Stack>
              )}

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button variant="contained" color="primary" startIcon={<UploadFileRoundedIcon />} onClick={onLoadGame}>Load Game</Button>
                <Button variant="outlined" startIcon={<SearchRoundedIcon />} onClick={analyzeFullGame} disabled={analyzing}>{analyzing ? `Analyzing ${progress}%` : 'Analyze'}</Button>
                <Button variant="outlined" onClick={()=> setSettingsOpen(true)}>Settings</Button>
                <input type="file" accept=".pgn,text/plain" ref={fileInputRef} onChange={onFileChange} hidden />
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Mini Graph */}
              <GraphMini series={series} />

              {/* Summary block after full-game analysis */}
              {(accuracySummary || estimatedElo || moveSummaries.length>0) && (
                <Stack spacing={1.2} sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {accuracySummary && (
                      <Box sx={{ px:1, py:0.5, bgcolor:'grey.800', borderRadius:1 }}>
                        <Typography variant="caption">Accuracy</Typography>
                        <Typography variant="body2">W {accuracySummary.white}% · B {accuracySummary.black}%</Typography>
                      </Box>
                    )}
                    {estimatedElo && (
                      <Box sx={{ px:1, py:0.5, bgcolor:'grey.800', borderRadius:1 }}>
                        <Typography variant="caption">Game Rating</Typography>
                        <Typography variant="body2">W {estimatedElo.white} · B {estimatedElo.black}</Typography>
                      </Box>
                    )}
                    {Object.keys(classCounts).length>0 && (
                      <Box sx={{ px:1, py:0.5, bgcolor:'grey.800', borderRadius:1 }}>
                        <Typography variant="caption">Move Quality</Typography>
                        <Typography variant="body2">Best {classCounts['Best']||0} · Good {classCounts['Good']||0} · Inacc {classCounts['Inaccuracy']||0} · Mist {classCounts['Mistake']||0} · Blun {classCounts['Blunder']||0}</Typography>
                      </Box>
                    )}
                  </Stack>
                  {/* First non-best recommendation */}
                  {moveSummaries.find(m=> m.cls!=='Best') && (
                    <Typography variant="body2" color="text.secondary">
                      {(() => { const m = moveSummaries.find(mi=> mi.cls!=='Best'); return m ? `${m.san} is a ${m.cls.toLowerCase()} · best was ${m.bestSan || '…'} · Δ ${(m.delta/100).toFixed(2)}` : '' })()}
                    </Typography>
                  )}
                </Stack>
              )}

              {/* Per-side quality counts */}
              {/* Engine vs You style quality table */}
              {(qualityCountsByColor.w || qualityCountsByColor.b) && (
                <>
                  <Typography variant="caption" color="text.secondary">Move Quality (per side)</Typography>
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Grade</TableCell>
                        <TableCell align="right">{headerInfo.white || 'White'}</TableCell>
                        <TableCell align="right">{headerInfo.black || 'Black'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        {k:'Splendid', icon:<StarRoundedIcon sx={{ fontSize:16, color:'#22d3ee' }} />},
                        {k:'Perfect',  icon:<CheckCircleRoundedIcon sx={{ fontSize:16, color:'#38bdf8' }} />},
                        {k:'Excellent',icon:<ThumbUpRoundedIcon sx={{ fontSize:16, color:'#22c55e' }} />},
                        {k:'Best',     icon:<CheckCircleRoundedIcon sx={{ fontSize:16, color:'#10b981' }} />},
                        {k:'Okay',     icon:<ThumbUpRoundedIcon sx={{ fontSize:16, color:'#84cc16' }} />},
                        {k:'Inaccuracy',icon:<WarningAmberRoundedIcon sx={{ fontSize:16, color:'#eab308' }} />},
                        {k:'Mistake',  icon:<ErrorOutlineRoundedIcon sx={{ fontSize:16, color:'#f97316' }} />},
                        {k:'Blunder',  icon:<ErrorOutlineRoundedIcon sx={{ fontSize:16, color:'#ef4444' }} />},
                      ].map(row=> (
                        <TableRow key={row.k}>
                          <TableCell sx={{ display:'flex', alignItems:'center', gap:1 }}>{row.icon}<span>{row.k}</span></TableCell>
                          <TableCell align="right">{qualityCountsByColor.w[row.k] || 0}</TableCell>
                          <TableCell align="right">{qualityCountsByColor.b[row.k] || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              {/* PV lines for current position */}
              <Box sx={{ flex: 0, overflow: 'hidden', pr: 1 }}>
                <EngineLinesPanel lines={lines as any} fen={game.fen()} />
              </Box>

              {/* Move list – Chesskit style */}
              {moveSummaries.length>0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Moves · click to jump</Typography>
                  <MoveList
                    moves={moveSummaries as any}
                    onJump={(m)=> { goToPly(m.ply); if (m.bestUci) setPreviewArrow({ from: m.bestUci.slice(0,2), to: m.bestUci.slice(2,4) }); if (m.playedUci) setPreviewMarker({ square: m.playedUci.slice(2,4), cls: m.cls }); }}
                  />
                </Box>
              )}

              {moveSummaries.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Moves · click a row to jump</Typography>
                  <Box sx={{ maxHeight: 240, overflow: 'auto', pr: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 44 }}>Ply</TableCell>
                          <TableCell>Move</TableCell>
                          <TableCell sx={{ width: 120 }}>Class</TableCell>
                          <TableCell sx={{ width: 80 }}>Δ</TableCell>
                          <TableCell>Best</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {moveSummaries.map((m) => (
                          <TableRow key={m.ply} hover sx={{ cursor:'pointer' }} onClick={()=> { goToPly(m.ply); if (m.bestUci) setPreviewArrow({ from: m.bestUci.slice(0,2), to: m.bestUci.slice(2,4) }); if (m.playedUci) setPreviewMarker({ square: m.playedUci.slice(2,4), cls: m.cls }); }}>
                            <TableCell>{m.ply}</TableCell>
                            <TableCell sx={{ fontFamily:'monospace' }}>{m.san}</TableCell>
                            <TableCell>
                              <Chip size="small" label={m.cls} sx={{ fontWeight:700, ...classChipStyle(m.cls) }} />
                            </TableCell>
                            <TableCell> {(m.delta/100).toFixed(2)} </TableCell>
                            <TableCell sx={{ fontFamily:'monospace' }}>{m.bestSan || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </>
              )}

              <Divider sx={{ mt: 2, mb: 1 }} />

              {/* Timeline slider removed per request; keep navigation arrows below. */}

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Flip"><span><IconButton size="small" onClick={() => setFlipped(v => !v)}><SwapVertRoundedIcon /></IconButton></span></Tooltip>
                  <Tooltip title="Start"><span><IconButton size="small" onClick={goStart}><FirstPageRoundedIcon /></IconButton></span></Tooltip>
                  <Tooltip title="Prev"><span><IconButton size="small" onClick={goPrev}><NavigateBeforeRoundedIcon /></IconButton></span></Tooltip>
                  <Tooltip title={isPlaying ? 'Pause' : 'Play'}><span><IconButton size="small" onClick={togglePlay}><PlayArrowRoundedIcon /></IconButton></span></Tooltip>
                  <Tooltip title="Next"><span><IconButton size="small" onClick={goNext}><NavigateNextRoundedIcon /></IconButton></span></Tooltip>
                  <Tooltip title="End"><span><IconButton size="small" onClick={goEnd}><LastPageRoundedIcon /></IconButton></span></Tooltip>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Copy PV"><span><IconButton size="small"><ContentCopyRoundedIcon /></IconButton></span></Tooltip>
                  <Tooltip title="Save"><span><IconButton size="small"><SaveRoundedIcon /></IconButton></span></Tooltip>
                </Stack>
              </Stack>
            </Paper>
            {/* Settings dialog */}
            <Dialog open={settingsOpen} onClose={()=> setSettingsOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Engine Settings</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <FormControl>
                    <InputLabel id="engine-variant">Engine</InputLabel>
                    <Select labelId="engine-variant" input={<OutlinedInput label="Engine" />} value={settings.variant}
                      onChange={(e)=> setSettings((s)=> ({ ...s, variant: e.target.value as string }))}
                    >
                      {['sf17','sf17-lite','sf17-single','sf161','sf161-lite','sf161-single','sf16-nnue','sf16-nnue-single','sf11'].map(v => (
                        <MenuItem key={v} value={v}>{v}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Threads" type="number" size="small" value={settings.threads} onChange={(e)=> setSettings(s=> ({...s, threads: Math.max(1, Math.min(32, Number(e.target.value)))}))} />
                  <TextField label="Workers" type="number" size="small" value={settings.workers} onChange={(e)=> setSettings(s=> ({...s, workers: Math.max(1, Math.min(8, Number(e.target.value)))}))} helperText="Local engine workers used for full-game analysis" />
                  <Stack>
                    <Typography variant="caption" color="text.secondary">Depth: {settings.depth}</Typography>
                    <Slider min={8} max={30} step={1} value={settings.depth} onChange={(_,v)=> setSettings(s=> ({...s, depth: v as number}))} />
                  </Stack>
                  <FormControl>
                    <InputLabel id="mpv">MultiPV</InputLabel>
                    <Select labelId="mpv" input={<OutlinedInput label="MultiPV" />} value={String(settings.mpv)} onChange={(e)=> setSettings(s=> ({...s, mpv: Number(e.target.value)}))}>
                      {[1,2,3,4,5,6].map(n => (<MenuItem key={n} value={String(n)}>{n}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={()=> setSettingsOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={()=> { setEngineVariant(settings.variant as any); setThreads(settings.threads); setEngineDepth(settings.depth); setMultiPv(settings.mpv); setSettingsOpen(false); }}>Apply</Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div />}> 
      <GameInner />
    </Suspense>
  );
}
