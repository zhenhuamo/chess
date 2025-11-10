// Module web worker to build a lightweight position index from a PGN stream.
// Message API:
//  - { type: 'build', endpoint: string, file: string, maxPlies?: number }
//  - Progress: { type: 'progress', message: string }
//  - Done: { type: 'done', entries: Array<[string, any]> }

// Note: This runs in a worker context (no DOM). We can use ESM imports.
import { Chess } from 'chess.js';

type MoveStat = { games: number; wrWhite?: number; wrBlack?: number };
type Node = { total: number; moves: Record<string, MoveStat> };

const fen4 = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

self.onmessage = async (ev: MessageEvent) => {
  const data = ev.data || {};
  if (data?.type !== 'build') return;
  const endpoint: string = data.endpoint;
  const file: string = data.file;
  const maxPlies: number = Number(data.maxPlies || 16);
  try {
    (self as any).postMessage({ type: 'progress', message: 'Fetching PGN…' });
    const resp = await fetch(`${endpoint}?file=${encodeURIComponent(file)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const games = splitPgn(text);
    const map = new Map<string, Node>();
    let processed = 0;
    for (let i = 0; i < games.length; i++) {
      const gtxt = games[i];
      if (!gtxt) continue;
      try {
        const res = extractResult(gtxt);
        const chess = new Chess();
        try { chess.loadPgn(gtxt); } catch { continue; }
        const verbose = chess.history({ verbose: true }) as any[];
        const startFen = (chess as any).getHeaders?.()?.FEN as string | undefined;
        const sim = new Chess(startFen);
        for (let ply = 0; ply < verbose.length && ply < maxPlies; ply++) {
          const beforeFen = fen4(sim.fen());
          const mv = verbose[ply];
          const uci = String(mv.from) + String(mv.to) + (mv.promotion || '');
          const side = sim.turn();
          const node = map.get(beforeFen) || { total: 0, moves: {} };
          node.total += 1;
          const ms: any = node.moves[uci] || { games: 0 };
          ms.games += 1;
          if (res) {
            const score = side === 'w' ? res.white : res.black;
            const key = side === 'w' ? 'wrWhite' : 'wrBlack';
            const cnt = (ms[key + '_n'] || 0) + 1;
            const prev = (ms[key] || 0) * (cnt - 1);
            ms[key] = (prev + score) / cnt;
            ms[key + '_n'] = cnt;
          }
          node.moves[uci] = ms;
          map.set(beforeFen, node);
          try { sim.move({ from: mv.from, to: mv.to, promotion: mv.promotion }); } catch { break; }
        }
      } catch {}
      processed++;
      if (i % 50 === 0) (self as any).postMessage({ type: 'progress', message: `Indexed ${processed}/${games.length} games…` });
      if (i % 200 === 0) await sleep(0);
    }
    (self as any).postMessage({ type: 'done', entries: Array.from(map.entries()) });
  } catch (e: any) {
    (self as any).postMessage({ type: 'error', message: e?.message || 'worker_failed' });
  }
};

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function splitPgn(text: string): string[] {
  const chunks: string[] = [];
  const lines = text.split(/\r?\n/);
  let cur: string[] = [];
  for (const ln of lines) {
    if (ln.startsWith('[Event ')) {
      if (cur.length) chunks.push(cur.join('\n').trim());
      cur = [ln];
    } else {
      cur.push(ln);
    }
  }
  if (cur.length) chunks.push(cur.join('\n').trim());
  return chunks;
}

function extractResult(pgn: string): { white: number; black: number } | null {
  const m = pgn.match(/\n\[Result\s+"([^"]+)"\]/);
  const r = m?.[1];
  switch (r) {
    case '1-0': return { white: 1, black: 0 };
    case '0-1': return { white: 0, black: 1 };
    case '1/2-1/2': return { white: 0.5, black: 0.5 };
    default: return null;
  }
}

