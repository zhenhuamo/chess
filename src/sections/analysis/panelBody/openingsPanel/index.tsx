import { Box, Chip, Divider, IconButton, Paper, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, currentPositionAtom } from "@/src/sections/analysis/states";
import { fenToFen4, rebuildPersonalBookFromDb, getTopPersonalMoves } from "@/src/services/personalBook";
import { usePersonalOpeningBook } from "@/src/hooks/usePersonalOpeningBook";
import { useLightBook } from "@/src/hooks/useLightBook";
import { moveLineUciToSan } from "@/src/lib/chess";
import { useMemo, useState } from "react";
import { useChessActions } from "@/src/hooks/useChessActions";
import { Icon } from "@iconify/react";
import { getEvaluateGameParams } from "@/src/lib/chess";

export default function OpeningsPanel() {
  const board = useAtomValue(boardAtom);
  const position = useAtomValue(currentPositionAtom);
  const fen = board.fen();
  const fen4 = useMemo(() => fenToFen4(fen), [fen]);
  const [rebuildKey, setRebuildKey] = useState(0);
  const { ready: personalReady, topMoves } = usePersonalOpeningBook(fen, rebuildKey);
  const { ready: bookReady, top: bookTop, all: bookAll, matchedBy } = useLightBook(fen);
  const [tab, setTab] = useState(0); // 0: My Stats, 1: Book
  const { addMoves, reset } = useChessActions(boardAtom);
  const toSan = useMemo(() => moveLineUciToSan(fen), [fen]);

  // find an engine PV that starts with a given uci move; return an array of SAN moves (limited)
  const pvSanForMove = (uci: string, maxN = 10): string[] => {
    const lines = position?.eval?.lines || [];
    const line = lines.find((l) => (l.pv?.[0] === uci));
    if (!line?.pv?.length) return [];
    return line.pv.slice(0, maxN).map((m) => toSan(m));
  };

  const playFirst = (uci: string) => {
    const san = toSan(uci);
    addMoves([san]);
  };

  const previewLine = (uci: string) => {
    const sanLine = pvSanForMove(uci, 10);
    if (sanLine.length === 0) { playFirst(uci); return; }
    reset({ fen, noHeaders: true });
    addMoves(sanLine);
  };

  const engineFirst = position?.eval?.lines?.[0]?.pv?.[0];
  const Row = ({ label, uci, badge, secondary }: { label: string; uci: string; badge?: string; secondary?: string }) => (
    <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography>
        {badge && <Chip size="small" label={badge} />}
        {engineFirst && engineFirst === uci && (
          <Chip size="small" color="success" label="PV#1" />
        )}
        {secondary && <Typography variant="caption" color="text.secondary">{secondary}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="只下一步">
          <IconButton size="small" onClick={() => playFirst(uci)}>
            <Icon icon="ri:arrow-right-s-line" />
          </IconButton>
        </Tooltip>
        <Tooltip title="预演多步（结合引擎主变）">
          <IconButton size="small" onClick={() => previewLine(uci)}>
            <Icon icon="ri:play-line" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );

  // Smart fallback for My Stats: walk back up to 4 plies to find nearest data
  const myStatsFallback = useMemo(() => {
    if (topMoves.length > 0) return null as null | { depth: number; list: typeof topMoves };
    if (!personalReady) return null;
    try {
      const { fens } = getEvaluateGameParams(board);
      const curIdx = fens.length - 1; // current position fen at end
      for (let back = 1; back <= 4; back++) {
        const idx = curIdx - back;
        if (idx < 0) break;
        const candidateFen = fens[idx];
        const list = getTopPersonalMoves(candidateFen, { topK: 3, minSamplesForWinRate: 10 }) as any;
        if (list && list.length) {
          return { depth: back, list } as any;
        }
      }
    } catch {}
    return null;
  }, [board, personalReady, topMoves.length]);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">Openings</Typography>
      <Tabs value={tab} onChange={(_,v)=> setTab(v)} aria-label="openings tabs" sx={{ minHeight: 0, mb: 1 }}>
        <Tab label="My Stats" sx={{ textTransform:'none', minHeight: 24 }} />
        <Tab label="Book" sx={{ textTransform:'none', minHeight: 24 }} />
      </Tabs>
      {tab === 0 && (
        <Stack spacing={1}>
          <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <Typography variant="body2" color="text.secondary">Top Personal Lines</Typography>
            <Tooltip title="Rebuild personal book (16 plies)">
              <span>
                <IconButton size="small" onClick={async ()=> { await rebuildPersonalBookFromDb(16); setRebuildKey((k)=>k+1); }}>
                  <Icon icon="ri:refresh-line" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          {personalReady && topMoves.length === 0 && (
            <>
              <Typography variant="body2" color="text.secondary">No personal data for this exact position.</Typography>
              {myStatsFallback && (
                <Typography variant="caption" color="text.secondary">Showing nearest stats from {myStatsFallback.depth} ply earlier.</Typography>
              )}
            </>
          )}
          {topMoves.map((m, i) => (
            <Row
              key={i}
              uci={m.uci}
              label={toSan(m.uci)}
              badge={typeof m.winRate === 'number' ? `${Math.round(m.winRate * 100)}%` : `${m.count}×`}
              secondary={typeof m.winRate === 'number' ? `(${m.count} games)` : undefined}
            />
          ))}
          {(!topMoves.length && myStatsFallback?.list) && myStatsFallback.list.map((m: any, i: number) => (
            <Row
              key={`fb-${i}`}
              uci={m.uci}
              label={toSan(m.uci)}
              badge={typeof m.winRate === 'number' ? `${Math.round(m.winRate * 100)}%` : `${m.count}×`}
              secondary={(typeof m.winRate === 'number' ? `(${m.count} games)` : undefined)}
            />
          ))}
        </Stack>
      )}
      {tab === 1 && (
        <Stack spacing={1}>
          {!bookReady && (
            <Typography variant="body2" color="text.secondary">Loading book…</Typography>
          )}
          {bookReady && bookTop.length === 0 && (
            <Typography variant="body2" color="text.secondary">No book lines for this position{matchedBy === 'fen2' ? ' (fen2)' : ''}.</Typography>
          )}
          {bookReady && engineFirst && (
            (() => {
              const list = (bookAll as any)?.nodes?.[fen4] || [];
              const inBook = list.some((n: any) => n.uci === engineFirst);
              return (
                <Typography variant="caption" color={inBook ? 'success.main' : 'warning.main'}>
                  {inBook ? 'Engine PV#1 is in book' : 'Engine PV#1 out of book (Novelty?)'}
                </Typography>
              );
            })()
          )}
          {bookTop.map((n, i) => (
            <Row key={i} uci={n.uci} label={toSan(n.uci)} badge={n.name || n.eco || `${n.weight}`} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
