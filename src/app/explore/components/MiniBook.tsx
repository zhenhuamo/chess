"use client";
import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';

type ExplorerMove = {
  uci: string;
  san: string;
  averageRating?: number;
  white: number;
  draws: number;
  black: number;
  game?: any;
};

export default function MiniBook({ moves, onMove }: { moves?: ExplorerMove[]; onMove?: (uci: string) => void }) {
  if (!moves || moves.length === 0) return <Typography variant="caption" color="text.secondary">No moves available.</Typography>;

  return (
    <Stack spacing={0.5}>
      {moves.slice(0, 5).map((m, i) => {
        const total = m.white + m.draws + m.black;
        return (
          <Paper
            key={m.uci}
            variant="outlined"
            sx={{
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => onMove && onMove(m.uci)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.san}</Typography>
              <Typography variant="caption" color="text.secondary">
                {total.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.primary' }}>{Math.round(m.white / total * 100)}% W</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{Math.round(m.draws / total * 100)}% D</Typography>
              <Typography variant="caption" sx={{ color: 'text.primary' }}>{Math.round(m.black / total * 100)}% B</Typography>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}
