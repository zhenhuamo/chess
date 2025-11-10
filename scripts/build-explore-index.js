#!/usr/bin/env node
/*
Build a compact opening/position index from one or more PGN sources (URL or local file).
Output: entries JSON and a gzipped copy, plus a manifest template.

Usage:
  node scripts/build-explore-index.js \
    --in https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn \
    --in https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn \
    --in https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn \
    --out explore-index-v2.json \
    --maxDepth 20 --topN 5 --minGames 3 
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const { Chess } = require('chess.js');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { inputs: [], out: 'explore-index-v2.json', maxDepth: 20, topN: 5, minGames: 3 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in') { opts.inputs.push(args[++i]); }
    else if (a === '--out') { opts.out = args[++i]; }
    else if (a === '--maxDepth') { opts.maxDepth = Number(args[++i]) || opts.maxDepth; }
    else if (a === '--topN') { opts.topN = Number(args[++i]) || opts.topN; }
    else if (a === '--minGames') { opts.minGames = Number(args[++i]) || opts.minGames; }
  }
  if (!opts.inputs.length) {
    console.error('Missing --in sources');
    process.exit(1);
  }
  return opts;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function readSource(src) {
  if (/^https?:\/\//i.test(src)) return fetchUrl(src);
  return fs.promises.readFile(src, 'utf8');
}

function splitPgn(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let cur = [];
  for (const ln of lines) {
    if (ln.startsWith('[Event ')) { if (cur.length) out.push(cur.join('\n').trim()); cur = [ln]; }
    else cur.push(ln);
  }
  if (cur.length) out.push(cur.join('\n').trim());
  return out;
}

function extractResult(pgn) {
  const m = pgn.match(/\n\[Result\s+"([^"]+)"\]/);
  const r = m && m[1];
  switch (r) {
    case '1-0': return { white: 1, black: 0 };
    case '0-1': return { white: 0, black: 1 };
    case '1/2-1/2': return { white: 0.5, black: 0.5 };
    default: return null;
  }
}

function fen4(fen) { return fen.split(' ').slice(0,4).join(' '); }

async function buildIndexFromTexts(texts, maxDepth) {
  const map = new Map(); // fen4 -> { total, moves: { uci: { games, wrWhite?, wrBlack? } } }
  let totalGames = 0;
  for (const text of texts) {
    const games = splitPgn(text);
    for (const gtxt of games) {
      if (!gtxt) continue;
      try {
        const res = extractResult(gtxt);
        const chess = new Chess();
        try { chess.loadPgn(gtxt); } catch { continue; }
        const verbose = chess.history({ verbose: true });
        const startFen = chess.getHeaders && chess.getHeaders().FEN || undefined;
        const sim = new Chess(startFen);
        for (let ply = 0; ply < verbose.length && ply < maxDepth; ply++) {
          const beforeFen = fen4(sim.fen());
          const mv = verbose[ply];
          const uci = String(mv.from) + String(mv.to) + (mv.promotion || '');
          const side = sim.turn();
          const node = map.get(beforeFen) || { total: 0, moves: {} };
          node.total += 1;
          const ms = node.moves[uci] || { games: 0 };
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
        totalGames++;
      } catch {}
    }
  }
  // Convert to entries and prune TopN/minGames
  const entries = [];
  for (const [k, node] of map.entries()) {
    const pruned = { total: node.total, moves: {} };
    const arr = Object.entries(node.moves)
      .filter(([,ms]) => (ms.games||0) >= MIN_GAMES)
      .sort((a,b) => (b[1].games - a[1].games))
      .slice(0, TOP_N);
    for (const [uci, ms] of arr) pruned.moves[uci] = { games: ms.games, wrWhite: ms.wrWhite, wrBlack: ms.wrBlack };
    entries.push([k, pruned]);
  }
  return { entries, totalGames };
}

let TOP_N = 5;
let MIN_GAMES = 3;
async function main() {
  const opts = parseArgs();
  TOP_N = opts.topN; MIN_GAMES = opts.minGames;
  console.log('[build] inputs:', opts.inputs);
  const texts = [];
  for (const src of opts.inputs) {
    console.log('[build] fetching/reading:', src);
    const txt = await readSource(src);
    texts.push(txt);
  }
  console.log('[build] building index…');
  const { entries, totalGames } = await buildIndexFromTexts(texts, opts.maxDepth);
  console.log('[build] total games parsed:', totalGames, 'nodes:', entries.length);
  const outJson = { entries };
  const outPath = path.resolve(opts.out);
  fs.writeFileSync(outPath, JSON.stringify(outJson));
  const gz = zlib.gzipSync(JSON.stringify(outJson));
  fs.writeFileSync(outPath + '.gz', gz);
  console.log('[build] wrote', outPath, 'and', outPath + '.gz', 'bytes=', gz.length);

  // Write a manifest template beside the output
  const version = 'v2-' + new Date().toISOString().slice(0,10);
  const manifest = {
    version,
    index: 'https://cacle.chess-analysis.org/explore/index/v2/' + outPath.split(path.sep).pop() + '.gz',
    createdAt: Date.now(),
    size: gz.length,
  };
  const manifestPath = path.resolve(path.dirname(outPath), 'explore-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('[build] wrote manifest template:', manifestPath);
}

main().catch((e) => { console.error('[build] failed:', e); process.exit(1); });

