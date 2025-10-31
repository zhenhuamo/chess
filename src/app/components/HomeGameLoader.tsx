'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Divider, Stack, Tab, Tabs, TextField, Typography, Chip, List, ListItem, ListItemText } from '@mui/material';
import { getChessComUserRecentGames } from '@/src/lib/chessCom';

type LoadedGame = {
  id: string;
  pgn: string;
  white: { name: string; rating?: number; title?: string };
  black: { name: string; rating?: number; title?: string };
  result?: string;
  timeControl?: string;
  date?: string;
  movesNb?: number;
  url?: string;
};

export default function HomeGameLoader({
  onAnalyzePGN,
  onAnalyzeLocalPGN,
}: {
  // Called when a game (from Chess.com) is picked
  onAnalyzePGN: (pgn: string) => void;
  // Called when user pastes PGN directly in this widget
  onAnalyzeLocalPGN?: (pgn: string) => void;
}) {
  const [tab, setTab] = useState(0); // 0: PGN, 1: Chess.com

  // PGN tab state
  const [pgn, setPgn] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Chess.com tab state
  const [username, setUsername] = useState('');
  const [debounced, setDebounced] = useState('');
  const [games, setGames] = useState<LoadedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce username input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(username.trim()), 300);
    return () => clearTimeout(t);
  }, [username]);

  // Fetch recent games from Chess.com when username changes
  useEffect(() => {
    if (!debounced) {
      setGames([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getChessComUserRecentGames(debounced, ctrl.signal)
      .then(setGames)
      .catch((e) => setError(e?.message || 'Failed to fetch games'))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced]);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="load game tabs" sx={{ minHeight: 0 }}>
        <Tab label="PGN" sx={{ textTransform: 'none', minHeight: 34 }} />
        <Tab label="Chess.com" sx={{ textTransform: 'none', minHeight: 34 }} />
      </Tabs>
      <Divider sx={{ mb: 2 }} />

      {/* PGN tab */}
      {tab === 0 && (
        <Stack spacing={1.5}>
          <TextField
            multiline
            minRows={4}
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder={'Paste a single PGN here...'}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={() => pgn.trim() && (onAnalyzeLocalPGN ?? onAnalyzePGN)(pgn)} disabled={!pgn.trim()}>
              Analyze PGN
            </Button>
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>Upload from file</Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt,application/x-chess-pgn,text/plain"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 2 * 1024 * 1024) { alert('File is too large (>2MB). Please upload a smaller PGN.'); return; }
                  const text = await file.text();
                  setPgn(text);
                } catch {
                  alert('Failed to read PGN file. Please try again.');
                } finally {
                  if (e.target) e.target.value = '';
                }
              }}
            />
          </Stack>
        </Stack>
      )}

      {/* Chess.com tab */}
      {tab === 1 && (
        <Stack spacing={1.5}>
          <TextField
            label="Chess.com username"
            placeholder="e.g. hikaru"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="small"
          />
          {loading && <Typography variant="body2">Loading…</Typography>}
          {!loading && error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}
          {!loading && !error && debounced && games.length === 0 && (
            <Typography variant="body2" color="warning.main">No games found. Please check your username.</Typography>
          )}

          <List sx={{ width: '100%', p: 0 }}>
            {games.map((g) => {
              const whiteWon = g.result === '1-0';
              const blackWon = g.result === '0-1';
              return (
                <ListItem
                  key={g.id}
                  divider
                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                  onClick={() => onAnalyzePGN(g.pgn)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography component="span" fontWeight={700} color={whiteWon ? 'success.main' : undefined}>
                          {g.white.name} ({g.white.rating ?? '?'})
                        </Typography>
                        <Typography component="span" color="text.secondary">vs</Typography>
                        <Typography component="span" fontWeight={700} color={blackWon ? 'success.main' : undefined}>
                          {g.black.name} ({g.black.rating ?? '?'})
                        </Typography>
                        <Chip size="small" label={g.result ?? '*'} variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                        {g.timeControl && <Chip size="small" label={g.timeControl} />}
                        {g.movesNb && <Chip size="small" label={`${Math.ceil((g.movesNb || 0) / 2)} moves`} />}
                        {g.date && <Chip size="small" label={g.date} />}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Stack>
      )}
    </Box>
  );
}
