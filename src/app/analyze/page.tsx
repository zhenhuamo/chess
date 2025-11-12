"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { Divider, Tab, Tabs, useMediaQuery, useTheme, Box, Accordion, AccordionSummary, AccordionDetails, Typography, Button } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
const Grid: any = Box;
import BoardContainer from "@/src/sections/analysis/board";
import PanelHeader from "@/src/sections/analysis/panelHeader";
import PanelToolBar from "@/src/sections/analysis/panelToolbar";
import AnalysisTab from "@/src/sections/analysis/panelBody/analysisTab";
import EngineLines from "@/src/sections/analysis/panelBody/analysisTab/engineLines";
import OpeningsPanel from "@/src/sections/analysis/panelBody/openingsPanel";
import GraphTab from "@/src/sections/analysis/panelBody/graphTab";
import Link from "next/link";
import MovesTab from "@/src/sections/analysis/panelBody/movesTab";
import GameLoader from "@/src/sections/analysis/gameLoader";
import { useAtomValue, useSetAtom } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom, gameMetaAtom, retryStateAtom } from "@/src/sections/analysis/states";
import { logEvent } from "@/src/lib/telemetry";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import EngineSettingsButton from "@/src/sections/engineSettings/engineSettingsButton";
import { PageTitle } from "@/src/components/pageTitle";
import RetryBar from "@/src/sections/analysis/panelBody/retryBar";

function GameAnalysisInner() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Right panel width (draggable). Persist across sessions.
  const [rightWidth, setRightWidth] = useState<number>(() => 560);
  const minRight = 420;
  const maxRightDefault = 980;
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));
  const gameEval = useAtomValue(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const setGame = useSetAtom(gameAtom);
  const setBoard = useSetAtom(boardAtom);
  const setRetry = useSetAtom(retryStateAtom);
  const retry = useAtomValue(retryStateAtom);
  const searchParams = useSearchParams();
  const setGameMeta = useSetAtom(gameMetaAtom);
  const showMovesTab = game.history().length > 0 || board.history().length > 0;
  // Show loader dialog state
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // load saved width
    try { const raw = localStorage.getItem('analyze-right-width'); if (raw) setRightWidth(Math.max(minRight, Math.min(maxRightDefault, Number(raw)))); } catch {}
    const onResize = () => {
      // clamp on window resize
      const maxR = Math.max(minRight, Math.min(maxRightDefault, (typeof window !== 'undefined' ? window.innerWidth - 480 : maxRightDefault)));
      setRightWidth((w) => Math.max(minRight, Math.min(maxR, w)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (tab === 1 && !showMovesTab) setTab(0); if (tab === 2 && !gameEval) setTab(0); }, [showMovesTab, gameEval, tab]);

  // Load game PGN from IndexedDB when ?gameId=... is present
  useEffect(() => {
    const idStr = searchParams?.get('gameId');
    if (!idStr) return;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    (async () => {
      try {
        console.log('[DB][Analyze] query gameId=', id);
        const { openDB } = await import('idb');
        const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { console.log('[DB][upgrade] creating store "games"'); db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
        console.log('[DB][Analyze] opened. stores=', Array.from(db.objectStoreNames||[]));
        const rec: any = await db.get('games', id);
        console.log('[DB][Analyze] get record ->', rec ? { has: true, keys: Object.keys(rec||{}), pgnLen: (rec.pgn||'').length } : { has:false });
        if (!rec?.pgn) return;
        const g = new Chess();
        try { g.loadPgn(rec.pgn); } catch {}
        if (!cancelled) {
          setGame(g);
          // 同步左侧棋盘到整局的当前局面（最后一步之后）
          // 这样进入页面时就不是起始位，避免“只有10步/起始位”的困惑
          setBoard(g);
          setGameMeta({ playerSide: rec.playerSide, origin: rec.origin, engineVariant: rec.engineVariant });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [searchParams, setGame, setBoard]);

  // Startup training bridge from /explore
  useEffect(() => {
    // If a specific gameId is loaded, skip the training startup
    const idStr = searchParams?.get('gameId');
    if (idStr) return;
    try {
      const raw = localStorage.getItem('analyze:startup');
      if (!raw) return;
      localStorage.removeItem('analyze:startup');
      const payload = JSON.parse(raw || 'null');
      const fen = String(payload?.fen || '');
      const acceptedUci: string[] = Array.isArray(payload?.acceptedUci) ? payload.acceptedUci : [];
      const attempts = Number(payload?.attempts || 3);
      if (!fen || !acceptedUci.length) return;
      const g = new Chess(fen);
      setGame(g);
      setBoard(new Chess(fen));
      setRetry({ active: true, baseFen: fen, allowedUci: acceptedUci, attemptsLeft: attempts, maxAttempts: attempts, hintStage: 0, message: 'Play one of the recommended candidates.' });
      logEvent('practice_started', { page: 'analyze', fen4: fen.split(' ').slice(0,4).join(' '), accepted: acceptedUci.length });
    } catch {}
  }, [searchParams, setGame, setBoard, setRetry]);

  // Auto-advance training queue when a retry succeeds
  useEffect(() => {
    if (!retry?.active || !retry?.success) return;
    try {
      const raw = localStorage.getItem('explore:trainingQueue');
      const q: Array<{ fen: string; acceptedUci: string[]; createdAt: number }> = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(q) || q.length === 0) return;
      // consume current task
      q.shift();
      localStorage.setItem('explore:trainingQueue', JSON.stringify(q));
      if (q.length > 0) {
        const next = q[0];
        const attempts = 3;
        const g = new Chess(next.fen);
        setGame(g);
        setBoard(new Chess(next.fen));
        setRetry({ active: true, baseFen: next.fen, allowedUci: next.acceptedUci || [], attemptsLeft: attempts, maxAttempts: attempts, hintStage: 0, message: 'Next task. Play one of the recommended candidates.' });
        logEvent('practice_next', { page: 'analyze', remaining: q.length, fen4: next.fen.split(' ').slice(0,4).join(' ') });
      } else {
        logEvent('practice_finish', { page: 'analyze' });
      }
    } catch {}
  }, [retry?.success, retry?.active, setBoard, setGame, setRetry]);

  // Flush telemetry on unload
  useEffect(() => {
    const onUnload = () => { try { const { flushTelemetry } = require('@/src/lib/telemetry'); flushTelemetry(); } catch {} };
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', onUnload);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onUnload); };
  }, []);
  // Drag handlers for vertical splitter
  const draggingRef = useRef(false);
  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    draggingRef.current = true;
    (document.body as any).style.userSelect = 'none';
  };
  const onDragMove = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Right width = distance from cursor to container right edge
    const px = rect.right - clientX;
    const maxR = Math.max(minRight, Math.min(maxRightDefault, window.innerWidth - 420));
    const next = Math.max(minRight, Math.min(maxR, px));
    setRightWidth(next);
  };
  const onMouseMove = (e: MouseEvent) => { if (!draggingRef.current) return; onDragMove(e.clientX); };
  const onTouchMove = (e: TouchEvent) => { if (!draggingRef.current) return; const t = e.touches[0]; if (t) onDragMove(t.clientX); };
  const stopDrag = () => { if (!draggingRef.current) return; draggingRef.current = false; (document.body as any).style.userSelect = ''; try { localStorage.setItem('analyze-right-width', String(Math.round(rightWidth))); } catch {} };
  useEffect(() => {
    const mm = (e: MouseEvent) => onMouseMove(e);
    const mu = () => stopDrag();
    const tm = (e: TouchEvent) => onTouchMove(e);
    const tu = () => stopDrag();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    window.addEventListener('touchmove', tm);
    window.addEventListener('touchend', tu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', tu); };
  }, [rightWidth]);

  // Check if there's a game loaded
  const hasGameFromUrl = searchParams?.get('gameId');
  const gameMoves = game.history();
  const hasGame = Boolean(hasGameFromUrl) || gameMoves.length > 0;

  return (
    <Grid ref={containerRef} display="flex" flexDirection="column" gap={2} width="100%" height="100vh">
      <PageTitle title="Chesskit Game Analysis" />
      <Grid display="flex" gap={0} justifyContent="space-between" alignItems="stretch" width="100%" flex={1} overflow="hidden" px={2}>
        {/* Left: Board */}
        <Box sx={{ flex: '1 1 auto', minWidth: 320, display: 'flex', justifyContent: 'center', alignItems: 'center', pr: 1.5 }}>
          <BoardContainer reservedWidth={rightWidth + 72} />
        </Box>
        {/* Splitter handle */}
        <Box onMouseDown={onDragStart as any} onTouchStart={onDragStart as any} sx={{ width: 8, cursor: 'col-resize', mx: 0.5, background: 'transparent', '&:hover': { background: 'action.hover' }, borderRadius: 1 }} />
        {/* Right: Panel */}
        <Grid display="flex" justifyContent="start" borderRadius={2} border={1} borderColor={'divider'} sx={{ backgroundColor: 'background.paper', borderColor: 'divider', borderWidth: 1.5, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }} p={2} rowGap={2} height="calc(100vh - 90px)" flexDirection="column" flexWrap="nowrap" width={{ xs: '100%', lg: rightWidth }} minWidth={{ xs: undefined, lg: 420 }} maxWidth={{ xs: undefined, lg: '980px' }} flexGrow={{ xs: 0, lg: 0 }} overflow="hidden">
          {isMounted && isLgOrGreater ? (
            <>
              <Box width="100%">
                <PanelHeader onLoadGame={() => setShowLoader(true)} />
                <Divider sx={{ marginX: "5%", marginTop: 2.5 }} />
              </Box>
              {/* Desktop: Compact with small graph + accordions */}
              <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Retry bar appears when active */}
                <RetryBar />
                {gameEval && (
                  <Box sx={{ flexShrink: 0 }}>
                    <GraphTab role="tabpanel" id="tabContent2" />
                  </Box>
                )}
                {/* Summary + Engine Lines merged into one section (moved above Moves) */}
                <Accordion defaultExpanded={false} disableGutters sx={{ backgroundColor: 'transparent', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Summary & Engine Lines</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <AnalysisTab role="tabpanel" id="tabContent0" />
                    {gameEval && (
                      <Box sx={{ mt: 1, maxHeight: '32vh', overflow: 'auto' }}>
                        <EngineLines />
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
                {/* Openings */}
                <Accordion defaultExpanded={false} disableGutters sx={{ backgroundColor: 'transparent', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Openings</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <OpeningsPanel />
                  </AccordionDetails>
                </Accordion>
                {/* Moves is the primary area; keep expanded and scrollable */}
                <Accordion defaultExpanded disableGutters sx={{ backgroundColor: 'transparent', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Moves</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ maxHeight: '42vh', overflow: 'auto' }}>
                      <MovesTab role="tabpanel" id="tabContent1" />
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
              <Box width="100%">
                <Divider sx={{ marginX: "5%", marginBottom: 1.5 }} />
                <PanelToolBar />
              </Box>
            </>
          ) : (
            <>
              <PanelToolBar />
              {!gameEval && <Divider sx={{ marginX: "5%" }} />}
              {!gameEval && <PanelHeader onLoadGame={() => setShowLoader(true)} />}
              {/* Mobile: Show tabs */}
              <Box width="95%" sx={{ borderBottom: 1, borderColor: "divider", marginX: { sm: "5%", xs: undefined } }}>
                <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} aria-label="tabs" variant="fullWidth" sx={{ minHeight: 0 }}>
                  <Tab label="Analysis" id="tab0" iconPosition="start" sx={{ textTransform: "none", minHeight: 15, padding: "5px 0em 12px" }} />
                  <Tab label="Moves" id="tab1" iconPosition="start" sx={{ textTransform: "none", minHeight: 15, display: showMovesTab ? undefined : "none", padding: "5px 0em 12px" }} />
                  <Tab label="Graph" id="tab2" iconPosition="start" sx={{ textTransform: "none", minHeight: 15, display: gameEval ? undefined : "none", padding: "5px 0em 12px" }} />
                </Tabs>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <GraphTab role="tabpanel" hidden={tab !== 2} id="tabContent2" />
                {/* Quick link to Explore current position */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Link prefetch={false} href={`/explore?fen=${encodeURIComponent(board.fen())}`}>
                    <Button size="small" variant="outlined">Explore this position</Button>
                  </Link>
                </Box>
                <AnalysisTab role="tabpanel" hidden={tab !== 0} id="tabContent0" />
                <MovesTab role="tabpanel" hidden={tab !== 1} id="tabContent1" />
              </Box>
              {gameEval && (
                <Box width="100%">
                  <Divider sx={{ marginX: "5%", marginBottom: 2.5 }} />
                  <PanelHeader />
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>
      <EngineSettingsButton />

      {/* Game Loader Modal */}
      {showLoader && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowLoader(false)}
        >
          <Box onClick={(e) => e.stopPropagation()}>
            <GameLoader onClose={() => setShowLoader(false)} />
          </Box>
        </Box>
      )}
    </Grid>
  );
}

export default function GameAnalysis() {
  return (
    <Suspense fallback={<div />}>
      <GameAnalysisInner />
    </Suspense>
  );
}
