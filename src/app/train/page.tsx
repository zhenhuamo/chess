"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Chess } from 'chess.js';

type Task = { fen: string; acceptedUci: string[]; createdAt: number };

export default function TrainPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    try { const raw = localStorage.getItem('explore:trainingQueue'); setTasks(raw ? JSON.parse(raw) : []); } catch {}
  }, []);

  const onStart = () => {
    if (!tasks.length) return;
    const first = tasks[0];
    const payload = { fen: first.fen, acceptedUci: first.acceptedUci, attempts: 3 };
    localStorage.setItem('analyze:startup', JSON.stringify(payload));
    location.href = '/analyze';
  };

  const onClear = () => { try { localStorage.removeItem('explore:trainingQueue'); setTasks([]); } catch {} };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'center' }}>
      <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 }, width: '100%', maxWidth: 1000 }}>
        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Practice</Typography>
          <Typography variant="body2" color="text.secondary">来自 /explore 的题目队列（本地）</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onStart} disabled={!tasks.length}>Start</Button>
            <Button onClick={onClear} disabled={!tasks.length}>Clear</Button>
          </Stack>
          {!tasks.length && (
            <Typography variant="body2" color="text.secondary">暂无题目。请前往 /explore，点击“Practice Now (5)”加入题目。</Typography>
          )}
          {!!tasks.length && (
            <Stack spacing={0.5}>
              {tasks.map((t, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontFamily:'ui-monospace, monospace' }}>{t.fen}</Typography>
                  <Typography variant="caption" color="text.secondary">Accepted: {t.acceptedUci.join(', ')}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

