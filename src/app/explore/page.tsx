"use client";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Box, Button, CircularProgress, Divider, Paper, Stack, TextField, Typography, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, Chip, Alert, Slider, Accordion, AccordionSummary, AccordionDetails, Snackbar, MenuItem, Select, FormControl, InputLabel, OutlinedInput, Checkbox, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Tab, Tabs } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Chess } from "chess.js";
import { atom, useAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
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

import ExploreLandingContent from "./components/ExploreLandingContent";

// Lichess Explorer Types
type ExplorerMove = {
  uci: string;
  san: string;
  averageRating?: number;
  white: number;
  draws: number;
  black: number;
  game?: any;
};

type ExplorerResponse = {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  topGames?: any[];
  recentGames?: any[];
  opening?: any;
};

const localGameAtom = atom(new Chess());
const previewGameAtom = atom(new Chess());

const SPEEDS = ['blitz', 'rapid', 'classical'];
const RATINGS = [1600, 1800, 2000, 2200, 2500];

export default function ExplorePage() {
  const [game, setGame] = useAtom(localGameAtom);
  const [fen, setFen] = useState<string>(() => game.fen());
  const [fenError, setFenError] = useState<string | null>(null);

  // API State
  const [dbSource, setDbSource] = useState<'lichess' | 'masters'>('lichess');
  const [selectedSpeeds, setSelectedSpeeds] = useState<string[]>(['blitz', 'rapid', 'classical']);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([2000, 2200, 2500]);

  // UI states
  const [sortKey, setSortKey] = useState<'hot' | 'win'>('hot');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [preview, setPreview] = useState<{ active: boolean; baseFen?: string; line?: string[]; startUci?: string; idx?: number; playing?: boolean }>({ active: false });
  const [trainingQueueSize, setTrainingQueueSize] = useState<number>(() => getTrainingQueue().length);
  const [snack, setSnack] = useState<{ open: boolean; message: string; action?: React.ReactNode }>(() => ({ open: false, message: '' }));
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [practiceCount, setPracticeCount] = useState<number>(5);

  // Data Fetching
  const fetchExplorer = async (): Promise<ExplorerResponse> => {
    const params = new URLSearchParams();
    params.append('fen', game.fen());

    if (dbSource === 'lichess') {
      // Lichess API expects comma-separated values, not repeated parameters
      if (selectedSpeeds.length > 0) {
        params.append('speeds', selectedSpeeds.join(','));
      }
      if (selectedRatings.length > 0) {
        params.append('ratings', selectedRatings.join(','));
      }
    }

    // In development without COEP, we can call Lichess API directly
    // In production or with COEP enabled, we need to use the proxy
    const isDev = process.env.NODE_ENV === 'development';
    const isCoepEnabled = process.env.NEXT_PUBLIC_ENABLE_COEP === '1';

    let endpoint: string;
    if (isDev && !isCoepEnabled) {
      // Direct API call (works without COEP)
      endpoint = dbSource === 'masters'
        ? 'https://explorer.lichess.ovh/masters'
        : 'https://explorer.lichess.ovh/lichess';
    } else {
      // Use proxy (for COEP or production via Cloudflare Functions)
      endpoint = `/api/explore/${dbSource}`;
    }

    console.log('[Explore] Fetching:', endpoint, params.toString());
    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
  };

  const { data: explorerData, isLoading, error } = useQuery({
    queryKey: ['explorer', game.fen(), dbSource, selectedSpeeds, selectedRatings],
    queryFn: fetchExplorer,
    staleTime: 60000,
    retry: 1
  });

  useEffect(() => {
    const onUnload = () => { try { const { flushTelemetry } = require('@/src/lib/telemetry'); flushTelemetry(); } catch { } };
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', onUnload);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onUnload); };
  }, []);

  // Chess actions
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
          try { const start = (preview as any).startUci as string | undefined; if (start) onAddToTraining(game.fen(), [start], setTrainingQueueSize); } catch { }
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

  const topMoves = useMemo(() => {
    if (!explorerData?.moves) return [];
    const moves = explorerData.moves.map(m => {
      const total = m.white + m.draws + m.black;
      const win = m.white + m.black > 0 ? (game.turn() === 'w' ? m.white : m.black) / total : 0;
      const winRate = game.turn() === 'w'
        ? (m.white / total)
        : (m.black / total);

      return {
        uci: m.uci,
        san: m.san,
        games: total,
        win: winRate,
        white: m.white,
        draws: m.draws,
        black: m.black,
        averageRating: m.averageRating
      };
    });

    if (sortKey === 'win') {
      return moves.sort((a, b) => b.win - a.win || b.games - a.games).slice(0, 10);
    }
    return moves.sort((a, b) => b.games - a.games).slice(0, 10);
  }, [explorerData, sortKey, game]);

  const eventCtx = useCallback(() => ({ fen4: fen4(game.fen()), source: dbSource, sortKey, queueSize: getTrainingQueue().length }), [game, dbSource, sortKey]);

  const onPracticeNow = useCallback((count: number): number => {
    if (!explorerData?.moves) return 0;
    try {
      const top = explorerData.moves.slice(0, Math.min(count, 5));
      const tasks: Array<{ fen: string; acceptedUci: string[]; createdAt: number }> = [];

      if (top.length > 0) {
        tasks.push({ fen: game.fen(), acceptedUci: [top[0].uci], createdAt: Date.now() });
      }

      if (tasks.length) {
        const q = getTrainingQueue();
        for (const t of tasks) q.push(t);
        try { localStorage.setItem('explore:trainingQueue', JSON.stringify(q)); } catch { }
        setTrainingQueueSize(q.length);
        logEvent('practice_now', { page: 'explore', ...eventCtx(), add: tasks.length, after: q.length });
        return tasks.length;
      }
    } catch (e) { console.warn('[PracticeNow] failed', e); }
    return 0;
  }, [explorerData, game, eventCtx]);

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

  const whitePlayer = useMemo(() => ({ name: 'White' }), []);
  const blackPlayer = useMemo(() => ({ name: 'Black' }), []);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1200, mx: 'auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* TOP TOOLBAR */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(45deg, #FFF 30%, #AAA 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Explorer
          </Typography>
          <FormControl size="small" variant="standard" sx={{ minWidth: 120 }}>
            <Select
              value={dbSource}
              onChange={(e) => setDbSource(e.target.value as any)}
              disableUnderline
              sx={{ fontWeight: 600, fontSize: '0.9rem' }}
            >
              <MenuItem value="lichess">Online DB</MenuItem>
              <MenuItem value="masters">Masters DB</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TuneRoundedIcon />}
            onClick={() => setSettingsOpen(true)}
            sx={{ borderRadius: 4, textTransform: 'none', borderColor: 'divider', color: 'text.secondary' }}
          >
            Filters & FEN
          </Button>
        </Stack>
      </Stack>

      {/* MAIN CONTENT */}
      <Stack spacing={4} alignItems="center" sx={{ flex: 1 }}>

        {/* BOARD SECTION */}
        <Box sx={{ width: '100%', maxWidth: 720, position: 'relative' }}>
          <Paper elevation={4} sx={{ borderRadius: 1, overflow: 'hidden', width: '100%' }}>
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

          {/* Loading Overlay */}
          {isLoading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 1 }}>
              <CircularProgress size={40} thickness={4} sx={{ color: 'white' }} />
            </Box>
          )}
        </Box>

        {/* TOP MOVES - HORIZONTAL SCROLL */}
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Top Moves</Typography>
            <ToggleButtonGroup
              size="small"
              value={sortKey}
              exclusive
              onChange={(_, v) => v && setSortKey(v)}
              sx={{ height: 24 }}
            >
              <ToggleButton value="hot" sx={{ fontSize: '0.75rem', px: 1 }}>Hot</ToggleButton>
              <ToggleButton value="win" sx={{ fontSize: '0.75rem', px: 1 }}>Win%</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1, px: 1, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
            {topMoves.length > 0 ? topMoves.map((m, i) => (
              <Paper
                key={m.uci}
                variant="outlined"
                onClick={() => onPlayMove(m.uci, game.fen(), playMove)}
                sx={{
                  minWidth: 140,
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Chip label={m.san} size="small" color={i === 0 ? "primary" : "default"} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                  <Typography variant="caption" color="text.secondary">{formatInt(m.games)}</Typography>
                </Stack>

                <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'divider', overflow: 'hidden', display: 'flex', mt: 1 }}>
                  <Box sx={{ width: `${m.white}%`, bgcolor: '#eee' }} />
                  <Box sx={{ width: `${m.draws}%`, bgcolor: '#aaa' }} />
                  <Box sx={{ width: `${m.black}%`, bgcolor: '#333' }} />
                </Box>
                <Stack direction="row" justifyContent="space-between" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  <span>{Math.round(m.win * 100)}% W</span>
                  <span>{m.averageRating || ''}</span>
                </Stack>
              </Paper>
            )) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No moves found.</Typography>
            )}
          </Stack>
        </Box>

        {/* TABS: GAMES & MINI BOOK */}
        <Box sx={{ width: '100%' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Model Games" />
            <Tab label="Mini Book" />
          </Tabs>

          {activeTab === 0 && (
            <ModelGames games={explorerData?.topGames || explorerData?.recentGames} />
          )}
          {activeTab === 1 && (
            <MiniBook moves={explorerData?.moves} onMove={(uci) => onPlayMove(uci, game.fen(), playMove)} />
          )}
        </Box>

      </Stack>

      {/* SETTINGS DIALOG */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Explorer Settings</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ py: 1 }}>
            {/* FEN */}
            <Stack spacing={1}>
              <Typography variant="subtitle2">Current Position (FEN)</Typography>
              <TextField
                fullWidth
                size="small"
                value={fen}
                onChange={(e) => setFen(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onApplyFen(); } }}
                placeholder="Paste FEN..."
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={onApplyFen} edge="end">
                      <PlayArrowRoundedIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />
              <Button size="small" onClick={() => { try { const f = game.fen(); setFen(f); setFenError(null); } catch { } }}>
                Sync from Board
              </Button>
            </Stack>

            <Divider />

            {/* FILTERS */}
            {dbSource === 'lichess' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2">Database Filters</Typography>
                <FormControl size="small" fullWidth>
                  <InputLabel>Speeds</InputLabel>
                  <Select
                    multiple
                    value={selectedSpeeds}
                    onChange={(e) => setSelectedSpeeds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput label="Speeds" />}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {SPEEDS.map((s) => (
                      <MenuItem key={s} value={s}>
                        <Checkbox checked={selectedSpeeds.indexOf(s) > -1} />
                        <ListItemText primary={s} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Ratings</InputLabel>
                  <Select
                    multiple
                    value={selectedRatings}
                    onChange={(e) => setSelectedRatings(typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : e.target.value as number[])}
                    input={<OutlinedInput label="Ratings" />}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {RATINGS.map((r) => (
                      <MenuItem key={r} value={r}>
                        <Checkbox checked={selectedRatings.indexOf(r) > -1} />
                        <ListItemText primary={r} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            <Divider />

            {/* PRACTICE */}
            <Stack spacing={1}>
              <Typography variant="subtitle2">Practice Drills</Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddTaskRoundedIcon />}
                onClick={() => {
                  if (practiceBusy) return;
                  setPracticeBusy(true);
                  const added = onPracticeNow(practiceCount) || 0;
                  setPracticeBusy(false);
                  if (added > 0) {
                    showSnack(`Added ${added} drills to queue`);
                    setSettingsOpen(false);
                  } else {
                    showSnack('No drills generated');
                  }
                }}
              >
                Generate Drills from Position
              </Button>
            </Stack>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        message={snack.message}
        action={snack.action}
      />

      {/* LANDING CONTENT SECTION */}
      <ExploreLandingContent />
    </Box>
  );
}

// Helpers
function getTrainingQueue(): any[] {
  try {
    const s = localStorage.getItem('explore:trainingQueue');
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function onPlayMove(uci: string, fen: string, playMove: (params: { from: string; to: string; promotion?: string }) => any) {
  try {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.slice(4) || undefined;
    playMove({ from, to, promotion });
  } catch { }
}

function onAddToTraining(fen: string, uciList: string[], setQ: (n: number) => void) {
  try {
    const q = getTrainingQueue();
    q.push({ fen, acceptedUci: uciList, createdAt: Date.now() });
    localStorage.setItem('explore:trainingQueue', JSON.stringify(q));
    setQ(q.length);
  } catch { }
}

function uciToSan(fen: string, uci: string): string {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined } as any);
    return m?.san || uci;
  } catch { return uci; }
}

function fen4(fen: string) {
  return fen.split(' ').slice(0, 4).join(' ');
}

function formatInt(n: any): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n ?? '0');
  return v.toLocaleString();
}

function normalizeFenInput(raw: string): string {
  const s = (raw || '').trim().replace(/\s+/g, ' ');
  const parts = s.split(' ');
  if (parts.length >= 6) return parts.slice(0, 6).join(' ');
  if (parts.length === 4) return `${parts[0]} ${parts[1]} ${parts[2] || '-'} ${parts[3] || '-'} 0 1`;
  if (parts.length === 2) return `${parts[0]} ${parts[1]} - - 0 1`;
  if (parts.length === 1 && parts[0].includes('/')) return `${parts[0]} w - - 0 1`;
  return s;
}

function applyExampleMove(uci: string, setFen: (s: string) => void, onApplyFen: () => void) {
  try {
    const d = new Chess();
    const from = uci.slice(0, 2), to = uci.slice(2, 4); const promotion = uci.slice(4) || undefined;
    d.move({ from, to, promotion } as any);
    const f = d.fen();
    setFen(f);
    onApplyFen();
  } catch { }
}

// Preview helpers
function previewClose(setPreview: (p: any) => void, timerRef: any) {
  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  setPreview({ active: false });
}

function onPreviewMoveInline(uci: string, rootFen: string, setPreview: (p: any) => void) {
  // For now, just preview the single move since we don't have a deep index
  // Or we could fetch deeper data?
  // Let's just show the move on the board in preview mode
  setPreview({ active: true, baseFen: rootFen, line: [uciToSan(rootFen, uci)], startUci: uci, idx: 0, playing: false });
}

function previewApply(preview: any, addMoves: (moves: string[]) => void, setPreview: (p: any) => void) {
  if (!preview?.active || !Array.isArray(preview.line)) return;
  addMoves(preview.line);
  setPreview({ active: false });
}

function previewReplay(preview: any, resetPreviewBoard: (opts: any) => void, addMovesToPreview: (moves: string[]) => void, timerRef: any) {
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

function computePreviewArrows(preview: any): Array<{ startSquare: string; endSquare: string; color?: string }> {
  try {
    if (!preview?.active || !preview?.baseFen || !Array.isArray(preview.line)) return [];
    // Simple arrow for the current move in preview
    // If we have a line, show the arrow for the *next* move to be played?
    // Or just the move that was clicked?
    // Let's show arrow for the move corresponding to startUci
    if (preview.startUci) {
      const from = preview.startUci.slice(0, 2);
      const to = preview.startUci.slice(2, 4);
      return [{ startSquare: from, endSquare: to, color: '#33a3ff' }];
    }
    return [];
  } catch { return []; }
}
