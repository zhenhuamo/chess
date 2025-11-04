"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Box, Paper, Stack, Typography, Button, Divider, CircularProgress } from "@mui/material";
import { Chess } from "chess.js";
import { atom, useAtom } from "jotai";
import Board from "@/src/components/board";
import { Color } from "@/src/types/enums";
import { SHARE_API_BASE } from "@/src/config/share";

export default function ShareViewStaticPage() {
  const pathname = usePathname();
  const id = String(pathname?.split("/").pop() || "");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fullGame, setFullGame] = useState<Chess | null>(null);
  const localGameAtom = useMemo(() => atom(new Chess()), []);
  const [game, setGame] = useAtom(localGameAtom);

  useEffect(() => {
    let cancelled = false;
    if (!id) { setErr("无效的链接"); setLoading(false); return; }
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(`${SHARE_API_BASE}/${id}`, { cache: 'force-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { pgn } = await r.json();
        const g = new Chess();
        g.loadPgn(pgn);
        if (!cancelled) {
          setFullGame(g);
          setGame(g);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id, setGame]);

  if (loading) {
    return <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={28} />
    </Box>;
  }
  if (err || !fullGame) {
    return <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography color="error">{err || '链接不存在或已过期。'}</Typography>
    </Box>;
  }

  const headers = (fullGame as any).getHeaders?.() || {};
  const white = { name: headers.White || 'White' };
  const black = { name: headers.Black || 'Black' };

  const openInAnalyzer = async () => {
    const { openDB } = await import('idb');
    const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } });
    const rec: any = {
      pgn: fullGame.pgn(),
      event: headers.Event,
      site: headers.Site,
      date: headers.Date,
      round: headers.Round,
      white, black,
      result: headers.Result,
      termination: headers.Termination,
      timeControl: headers.TimeControl,
    };
    const gid = await db.add('games', rec);
    location.href = `/analyze?gameId=${gid}`;
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 }, width: '100%', maxWidth: 1100 }}>
        <Stack spacing={1.2}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {white.name} vs {black.name} {headers?.Date ? `· ${headers.Date}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">{headers?.Event || ''} {headers?.Site ? `· ${headers.Site}` : ''} {headers?.Result ? `· ${headers.Result}` : ''}</Typography>

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Board
              id="share-view"
              canPlay={false}
              gameAtom={localGameAtom}
              boardOrientation={Color.White}
              whitePlayer={white}
              blackPlayer={black}
              showEvaluationBar={false}
            />
            <Box sx={{ flex: '1 1 320px', minWidth: 320 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Moves</Typography>
              <Box sx={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5 }}>
                {fullGame.history({ verbose: true }).map((m: any, i: number) => {
                  const num = Math.floor(i / 2) + 1;
                  const prefix = i % 2 === 0 ? `${num}. ` : '';
                  return <span key={i}>{prefix}{m.san}{i < fullGame.history().length - 1 ? ' ' : ''}</span>;
                })}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={openInAnalyzer}>Open in Analyzer</Button>
                <Button onClick={() => navigator.clipboard.writeText(location.href)}>Copy Link</Button>
                <Button onClick={() => navigator.clipboard.writeText(fullGame.pgn())}>Copy PGN</Button>
              </Box>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary">此页面不索引（noindex）。</Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

