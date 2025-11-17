'use client';

import { useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography, Divider, useTheme, IconButton } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import { Chess } from 'chess.js';
import { formatGameToDatabase, setGameHeaders } from '@/src/lib/chess';
import { gameAtom, gameMetaAtom } from './states';
import { useSetAtom } from 'jotai';
import { openDB } from 'idb';

export default function GameLoader({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  // PGN tab state
  const [pgn, setPgn] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Atoms
  const setGame = useSetAtom(gameAtom);
  const setGameMeta = useSetAtom(gameMetaAtom);

  const analyzeLocalPgn = async (pgnText: string) => {
    if (!pgnText?.trim()) return;
    try {
      const g = new Chess();
      g.loadPgn(pgnText);
      try { setGameHeaders(g, { white: { name: 'You' }, black: { name: 'Stockfish' } }); } catch {}

      const db = await openDB('games', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('games')) {
            db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
          }
        }
      });

      const rec: any = {
        ...(formatGameToDatabase(g) as any),
        playerSide: 'w',
        origin: 'analyze',
        engineVariant: 'sf17-lite'
      };

      const id = (await db.add('games', rec)) as unknown as number;

      // Reload page with gameId
      window.location.href = `/analyze?gameId=${id}`;
    } catch {
      alert('Failed to load PGN. Please check the format.');
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
      p: 3
    }}>
      <Paper variant="outlined" sx={{
        p: { xs: 2, md: 3 },
        maxWidth: 600,
        width: '100%',
        borderRadius: 2,
        backgroundColor: 'background.paper',
        position: 'relative'
      }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <CloseIcon />
        </IconButton>
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
            Load a Game to Analyze
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Upload a PGN file or paste your game to get started with engine analysis
          </Typography>
          <Divider />

          <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="load game tabs" sx={{ minHeight: 0 }}>
            <Tab label="PGN Upload" sx={{ textTransform: 'none', minHeight: 34 }} />
          </Tabs>
          <Divider sx={{ mb: 2 }} />

          {/* PGN tab */}
          {tab === 0 && (
            <Stack spacing={1.5}>
              <TextField
                multiline
                minRows={6}
                maxRows={12}
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                placeholder={'Paste your PGN here...\n\nExample:\n[Event "Casual Game"]\n[Site "?"]\n[Date "2025.01.01"]\n...\n\n1. e4 e5 2. Nf3 Nc6...'}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => analyzeLocalPgn(pgn)}
                  disabled={!pgn.trim()}
                  fullWidth
                >
                  Analyze This Game
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  fullWidth
                >
                  Upload PGN File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn,.txt,application/x-chess-pgn,text/plain"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('File is too large (>2MB). Please upload a smaller PGN.');
                        return;
                      }
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

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            💡 Tip: You can also load games from chess-analysis.org on the homepage, then click "Analyze" to switch here
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
