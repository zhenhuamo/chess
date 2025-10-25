"use client";
import { Box, Stack, Typography } from "@mui/material";

export type MoveClass = 'Splendid' | 'Perfect' | 'Excellent' | 'Best' | 'Okay' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';

export interface MoveItem {
  ply: number;
  san: string;
  color: 'w'|'b';
  cls: MoveClass;
  delta: number;
  bestSan?: string;
  bestUci?: string;
  playedUci?: string;
}

const clsColor: Record<MoveClass, string> = {
  Splendid: '#22d3ee',
  Perfect: '#38bdf8',
  Excellent: '#22c55e',
  Best: '#10b981',
  Okay: '#84cc16',
  Good: '#22c55e',
  Inaccuracy: '#eab308',
  Mistake: '#f97316',
  Blunder: '#ef4444',
};

function Dot({ color }: { color: string }) {
  return <Box component="span" sx={{ display:'inline-block', width: 8, height: 8, borderRadius:'50%', bgcolor: color, mr: 0.75 }} />
}

export default function MoveList({
  moves,
  onJump,
}: {
  moves: MoveItem[];
  onJump: (m: MoveItem) => void;
}) {
  if (!moves?.length) return null;
  // group into full moves
  const maxMoveNo = Math.ceil(moves[moves.length - 1].ply / 2);
  const get = (no:number, color:'w'|'b') => moves.find(m => m.ply === (color==='w' ? (no*2-1) : (no*2)));

  return (
    <Stack spacing={0.75} sx={{ maxHeight: 260, overflow:'auto' }}>
      {Array.from({ length: maxMoveNo }).map((_,i)=> {
        const no = i+1; const w = get(no,'w'); const b = get(no,'b');
        return (
          <Stack key={no} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 28, textAlign:'right', color:'text.secondary', fontSize: 12 }}>{no}.</Box>
            <Box sx={{ flex:1, minHeight: 20, cursor: w? 'pointer':'default' }} onClick={()=> w && onJump(w)}>
              {w ? (
                <Typography variant="body2" sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                  <Dot color={clsColor[w.cls]} />
                  <span style={{ fontFamily:'monospace' }}>{w.san}</span>
                  <span style={{ color:'#94a3b8', marginLeft:6 }}>Δ {(w.delta/100).toFixed(2)}</span>
                </Typography>
              ) : <Typography variant="body2" color="text.disabled">–</Typography>}
            </Box>
            <Box sx={{ flex:1, minHeight: 20, cursor: b? 'pointer':'default' }} onClick={()=> b && onJump(b)}>
              {b ? (
                <Typography variant="body2" sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                  <Dot color={clsColor[b.cls]} />
                  <span style={{ fontFamily:'monospace' }}>{b.san}</span>
                  <span style={{ color:'#94a3b8', marginLeft:6 }}>Δ {(b.delta/100).toFixed(2)}</span>
                </Typography>
              ) : <Typography variant="body2" color="text.disabled">–</Typography>}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

