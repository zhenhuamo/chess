"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Chess } from "chess.js";
import { atom, useAtom } from "jotai";
import Board from "@/src/components/board";
import { Color } from "@/src/types/enums";
import { SHARE_API_BASE } from "@/src/config/share";
import { boardHueAtom } from "@/src/components/board/states";
import { useSetAtom } from "jotai";

export default function EmbedPage() {
  // 通过 window.location 解析参数，避免 useSearchParams 在静态导出阶段触发 SSR 限制
  const [parsed, setParsed] = useState<{ id: string; theme: string; auto: boolean; speed: number } | null>(null);
  useEffect(() => {
    try {
      const { pathname, search } = window.location;
      const id = String(pathname.split('/').pop() || '');
      const sp = new URLSearchParams(search);
      const theme = (sp.get('theme') || 'light').toLowerCase();
      const auto = (sp.get('auto') || '0') === '1';
      const speedRaw = Number(sp.get('speed') || 800);
      const speed = Math.max(200, Math.min(5000, isFinite(speedRaw) ? speedRaw : 800));
      setParsed({ id, theme, auto, speed });
    } catch {
      setParsed({ id: '', theme: 'light', auto: false, speed: 800 });
    }
  }, []);

  const setHue = useSetAtom(boardHueAtom);
  useEffect(() => {
    if (!parsed) return;
    // Rough theme mapping via board hue shift
    setHue(parsed.theme === "dark" ? 200 : 0);
    if (parsed.theme === "dark") document.body.style.background = "#0b0f14";
  }, [parsed, setHue]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fullGame, setFullGame] = useState<Chess | null>(null);
  const localGameAtom = useMemo(() => atom(new Chess()), []);
  const [game, setGame] = useAtom(localGameAtom);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);
        if (!parsed?.id) throw new Error('missing id');
        const r = await fetch(`${SHARE_API_BASE}/${parsed.id}`, { cache: 'force-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { pgn } = (await r.json()) as any;
        const g = new Chess();
        g.loadPgn(pgn);
        if (!cancelled) {
          setFullGame(g);
          // Initially show starting position
          const startFen = (g as any).getHeaders?.()?.FEN as string | undefined;
          const d = new Chess(startFen);
          setGame(d);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (parsed?.id) run();
    return () => { cancelled = true; };
  }, [parsed, setGame]);

  // Auto playback
  useEffect(() => {
    if (!parsed?.auto || !fullGame) return;
    const moves = fullGame.history();
    if (moves.length === 0) return;
    let idx = 0;
    const startFen = (fullGame as any).getHeaders?.()?.FEN as string | undefined;
    const tick = () => {
      const d = new Chess(startFen);
      for (let i = 0; i < idx && i < moves.length; i++) {
        try { d.move(moves[i]); } catch { }
      }
      setGame(d);
      idx = (idx + 1);
      if (idx <= moves.length) timerRef.current = setTimeout(tick, parsed.speed);
    };
    timerRef.current = setTimeout(tick, parsed.speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [parsed, fullGame, setGame]);

  if (loading) {
    return <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={28} />
    </Box>;
  }
  if (err || !fullGame) {
    return <Box sx={{ p: 2, textAlign: 'center', color: '#888', fontSize: 14 }}>Link does not exist or has expired.</Box>;
  }

  const headers = (fullGame as any).getHeaders?.() || {};
  const white = { name: headers.White || 'White' };
  const black = { name: headers.Black || 'Black' };

  return (
    <Box sx={{ p: 0.5, display: 'flex', justifyContent: 'center' }}>
      <Board
        id="embed-view"
        canPlay={false}
        gameAtom={localGameAtom}
        boardOrientation={Color.White}
        whitePlayer={white}
        blackPlayer={black}
        showEvaluationBar={false}
      />
    </Box>
  );
}
