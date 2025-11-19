import { Box, Chip, IconButton, Paper, Stack, Tab, Tabs, Tooltip, Typography, ToggleButtonGroup, ToggleButton, CircularProgress } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, currentPositionAtom } from "@/src/sections/analysis/states";
import { fenToFen4, rebuildPersonalBookFromDb, getTopPersonalMoves } from "@/src/services/personalBook";
import { usePersonalOpeningBook } from "@/src/hooks/usePersonalOpeningBook";
import { useLichessExplorer } from "@/src/hooks/useLichessExplorer";
import { moveLineUciToSan, getEvaluateGameParams } from "@/src/lib/chess";
import { useMemo, useState } from "react";
import { useChessActions } from "@/src/hooks/useChessActions";
import { Icon } from "@iconify/react";

export default function OpeningsPanel() {
  const board = useAtomValue(boardAtom);
  const position = useAtomValue(currentPositionAtom);
  const fen = board.fen();
  const [rebuildKey, setRebuildKey] = useState(0);

  // Personal Book
  const { ready: personalReady, topMoves } = usePersonalOpeningBook(fen, rebuildKey);

  // Lichess Explorer
  const [explorerDb, setExplorerDb] = useState<'lichess' | 'masters'>('lichess');
  const { data: explorerData, loading: explorerLoading, error: explorerError } = useLichessExplorer(fen, { db: explorerDb });

  const [tab, setTab] = useState(0); // 0: Lichess, 1: My Stats
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

  const Row = ({ label, uci, badge, secondary, right }: { label: string; uci: string; badge?: string; secondary?: string; right?: any }) => (
    <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>{label}</Typography>
        {badge && <Chip size="small" label={badge} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />}
        {engineFirst && engineFirst === uci && (
          <Chip size="small" color="success" label="PV#1" sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
        {secondary && <Typography variant="caption" color="text.secondary">{secondary}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {right}
        <Tooltip title="Play next move">
          <IconButton size="small" onClick={() => playFirst(uci)}>
            <Icon icon="ri:arrow-right-s-line" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Preview multiple moves (with engine main PV)">
          <IconButton size="small" onClick={() => previewLine(uci)}>
            <Icon icon="ri:play-line" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );

  // Smart fallback for My Stats
  const myStatsFallback = useMemo(() => {
    if (topMoves.length > 0) return null as null | { depth: number; list: typeof topMoves };
    if (!personalReady) return null;
    try {
      const { fens } = getEvaluateGameParams(board);
      const curIdx = fens.length - 1;
      for (let back = 1; back <= 4; back++) {
        const idx = curIdx - back;
        if (idx < 0) break;
        const candidateFen = fens[idx];
        const list = getTopPersonalMoves(candidateFen, { topK: 3, minSamplesForWinRate: 10 }) as any;
        if (list && list.length) {
          return { depth: back, list } as any;
        }
      }
    } catch { }
    return null;
  }, [board, personalReady, topMoves.length]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">Openings</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="openings tabs" sx={{ minHeight: 0, mb: 1 }}>
        <Tab label="Lichess" sx={{ textTransform: 'none', minHeight: 24 }} />
        <Tab label="My Stats" sx={{ textTransform: 'none', minHeight: 24 }} />
      </Tabs>

      {/* Lichess Explorer Tab */}
      {tab === 0 && (
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ToggleButtonGroup
              size="small"
              value={explorerDb}
              exclusive
              onChange={(_, v) => v && setExplorerDb(v)}
              sx={{ height: 24 }}
            >
              <ToggleButton value="lichess" sx={{ py: 0, fontSize: '0.75rem' }}>Lichess</ToggleButton>
              <ToggleButton value="masters" sx={{ py: 0, fontSize: '0.75rem' }}>Masters</ToggleButton>
            </ToggleButtonGroup>
            {explorerData?.opening && (
              <Tooltip title={`${explorerData.opening.eco} ${explorerData.opening.name}`}>
                <Chip label={`${explorerData.opening.eco} ${explorerData.opening.name}`} size="small" variant="outlined" sx={{ maxWidth: 220 }} />
              </Tooltip>
            )}
          </Box>

          {explorerLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {explorerError && (
            <Typography variant="body2" color="error">
              {explorerError}
            </Typography>
          )}

          {!explorerLoading && !explorerError && explorerData?.moves.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No games found in {explorerDb === 'masters' ? 'Masters' : 'Lichess'} database.
            </Typography>
          )}

          {!explorerLoading && explorerData?.moves.map((move) => {
            const total = move.white + move.draws + move.black;
            const winRate = total > 0 ? Math.round(((move.white + move.draws * 0.5) / total) * 100) : 0;
            // For Lichess DB, we might want to show White% / Draw% / Black% bars, but for now simple text
            // Let's show: Win% (Games)
            return (
              <Row
                key={move.uci}
                uci={move.uci}
                label={move.san}
                badge={explorerDb === 'masters' ? undefined : `Avg ${move.averageRating}`}
                secondary={`${formatNumber(total)} games`}
                right={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {Math.round((move.white / total) * 100)}% / {Math.round((move.draws / total) * 100)}% / {Math.round((move.black / total) * 100)}%
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            );
          })}

          {/* Top Games Section (only for Masters usually, or if we want to show recent games) */}
          {!explorerLoading && explorerData?.topGames && explorerData.topGames.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Top Games</Typography>
              <Stack spacing={0.5}>
                {explorerData.topGames.slice(0, 3).map(game => (
                  <Paper key={game.id} variant="outlined" sx={{ p: 0.5, px: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <Box>
                      <span>{game.white.name} ({game.white.rating})</span>
                      <span style={{ margin: '0 4px' }}>vs</span>
                      <span>{game.black.name} ({game.black.rating})</span>
                    </Box>
                    <Box sx={{ opacity: 0.7 }}>
                      {game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½'} ({game.year})
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}

      {/* My Stats Tab */}
      {tab === 1 && (
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Top Personal Lines</Typography>
            <Tooltip title="Rebuild personal book (16 plies)">
              <span>
                <IconButton size="small" onClick={async () => { await rebuildPersonalBookFromDb(16); setRebuildKey((k) => k + 1); }}>
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
    </Box>
  );
}
