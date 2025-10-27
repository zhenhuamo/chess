'use client';

import { useRef, useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Container, Button, Paper, Stack, TextField, Divider } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { formatGameToDatabase, setGameHeaders } from '@/src/lib/chess';

export default function LandingPage() {
  const [pgn, setPgn] = useState('');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read a local .pgn file and load its text into the textarea.
  // Keeping this simple: first file only; if multiple games exist in one file,
  // chess.js will read the first game when analyzing.
  const handlePgnFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Soft size guard to avoid freezing the UI on very large files.
      if (file.size > 2 * 1024 * 1024) {
        // ~2MB
        alert('文件过大（>2MB）。请只上传单局或较小的PGN。');
        return;
      }
      const text = await file.text();
      setPgn(text);
    } catch {
      alert('读取 PGN 文件失败，请重试。');
    } finally {
      // Allow selecting the same file again by clearing the value
      if (e.target) e.target.value = '';
    }
  };

  const analyzePgn = async () => {
    if (!pgn.trim()) return;
    try {
      const g = new Chess();
      g.loadPgn(pgn);
      try { setGameHeaders(g, { white: { name: 'You' }, black: { name: 'Stockfish' } }); } catch {}
      const { openDB } = await import('idb');
      const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
      const rec: any = { ...(formatGameToDatabase(g) as any), playerSide: 'w', origin: 'home', engineVariant: 'sf17-lite' };
      const id = (await db.add('games', rec)) as unknown as number;
      router.push(`/analyze?gameId=${id}`);
    } catch {
      router.push('/analyze');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>♔ Chess Analyzer</Typography>
          <Button LinkComponent={Link} href="/play" variant="contained">Play</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, flex: 1, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left: Hero + PGN analyze card */}
        <Stack spacing={2} sx={{ flex: 2 }}>
          <Typography variant="h4" fontWeight={700}>Analyze Chess Games Instantly</Typography>
          <Typography variant="body1" color="text.secondary">Paste a PGN to analyze or jump straight into a game against Stockfish.</Typography>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">Paste PGN</Typography>
              <TextField multiline minRows={6} value={pgn} onChange={(e)=> setPgn(e.target.value)} placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...'} fullWidth />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={analyzePgn} disabled={!pgn.trim()}>Analyze PGN</Button>
                <Button LinkComponent={Link} href="/play" variant="outlined">Play vs Stockfish</Button>
                <Button variant="text" onClick={() => fileInputRef.current?.click()}>Upload PGN</Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn,.txt,application/x-chess-pgn,text/plain"
                  style={{ display: 'none' }}
                  onChange={handlePgnFile}
                />
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        {/* Right: Feature list */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, alignSelf: 'flex-start' }}>
          <Typography variant="subtitle2" color="text.secondary">Why Chess Analyzer</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={1}>
            <Typography variant="body2">• Instant evaluation with Stockfish</Typography>
            <Typography variant="body2">• Best move suggestions</Typography>
            <Typography variant="body2">• Runs locally in your browser</Typography>
            <Typography variant="body2">• Free and open source</Typography>
          </Stack>
        </Paper>
      </Container>

      <Box sx={{ py: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">© 2024 Chess Analyzer · Powered by Stockfish</Typography>
      </Box>
    </Box>
  );
}
