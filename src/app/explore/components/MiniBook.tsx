"use client";
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Chess } from 'chess.js';

type MoveStat = { games: number; wrWhite?: number; wrBlack?: number };
type Node = { total: number; moves: Record<string, MoveStat> };

function fen4(fen: string): string { return fen.split(' ').slice(0,4).join(' '); }

function uciToSan(fen: string, uci: string): string {
  try {
    const d = new Chess(fen);
    const move: any = { from: uci.slice(0,2), to: uci.slice(2,4) };
    if (uci.length > 4) move.promotion = uci.slice(4);
    const m = d.move(move);
    return m?.san || uci;
  } catch { return uci; }
}

export default function MiniBook({ indexMap, rootFen, depth = 2, topN = 3, onMove }: { indexMap: Map<string, Node>; rootFen: string; depth?: number; topN?: number; onMove?: (uci: string)=> void }) {
  const tree = useMemo(() => buildTree(indexMap, rootFen, depth, topN), [indexMap, rootFen, depth, topN]);
  return <Box>{tree.map((n) => (
    <Row key={`${n.key}`} level={n.level} san={n.san} uci={n.uci} games={n.games} win={n.win} onClick={()=> onMove && onMove(n.uci)} />
  ))}</Box>;
}

function buildTree(index: Map<string, Node>, rootFen: string, depth: number, topN: number): Array<{ key: string; level: number; san: string; uci: string; games: number; win?: number }> {
  const out: Array<{ key: string; level: number; san: string; uci: string; games: number; win?: number }> = [];
  try {
    const d = new Chess(rootFen);
    const node = index.get(fen4(d.fen()));
    if (!node) return out;
    const side = d.turn();
    const entries = Object.entries(node.moves).map(([uci, ms]) => ({ uci, games: ms.games || 0, win: side === 'w' ? ms.wrWhite : ms.wrBlack, san: uciToSan(d.fen(), uci) }));
    entries.sort((a,b)=> b.games - a.games || ((b.win||0)-(a.win||0)));
    const chosen = entries.slice(0, topN);
    for (const m of chosen) {
      out.push({ key: `${fen4(d.fen())}-${m.uci}-0`, level: 0, san: m.san, uci: m.uci, games: m.games, win: m.win });
      if (depth > 0) {
        const c = new Chess(rootFen);
        try { c.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci.slice(4) || undefined } as any); } catch { continue; }
        const childNode = index.get(fen4(c.fen()));
        if (!childNode) continue;
        const side2 = c.turn();
        const e2 = Object.entries(childNode.moves).map(([uci, ms]) => ({ uci, games: ms.games || 0, win: side2 === 'w' ? ms.wrWhite : ms.wrBlack, san: uciToSan(c.fen(), uci) }));
        e2.sort((a,b)=> b.games - a.games || ((b.win||0)-(a.win||0)));
        for (const n of e2.slice(0, topN)) {
          out.push({ key: `${fen4(c.fen())}-${n.uci}-1`, level: 1, san: n.san, uci: n.uci, games: n.games, win: n.win });
        }
      }
    }
  } catch {}
  return out;
}

function Row({ level, san, games, win, uci, onClick }: { level: number; san: string; games: number; win?: number; uci: string; onClick: ()=> void }) {
  return (
    <Box sx={{ pl: level * 2, cursor: 'pointer', userSelect: 'none' }} onClick={onClick}>
      <Typography variant="caption" sx={{ fontFamily:'monospace' }}>{san}</Typography>
      <Typography variant="caption" color="text.secondary"> · {games} · {typeof win==='number'? `${Math.round(win*100)}%`:'—'}</Typography>
    </Box>
  );
}

