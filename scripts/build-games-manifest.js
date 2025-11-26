#!/usr/bin/env node
/**
 * Build a Games Feed manifest (v2) from one or more PGN files (remote URLs).
 * Output: JSON and a gzipped copy.
 *
 * Usage:
 *   node scripts/build-games-manifest.js \
 *     --in https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn \
 *     --in https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn \
 *     --out out/games-manifest.json
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Chess } = require('chess.js');

function parseArgs(argv) {
  const args = { inputs: [], out: 'out/games-manifest.json', max: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') { args.inputs.push(argv[++i]); }
    else if (a === '--out') { args.out = argv[++i]; }
    else if (a === '--max') { args.max = parseInt(argv[++i] || '0', 10) || 0; }
  }
  if (!args.inputs.length) throw new Error('At least one --in <url> is required');
  return args;
}

function toB64Safe(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function extractHeadersBlockText(lines) {
  // lines is an array of already-trimmed lines for the current header block
  const headers = {};
  for (const line of lines) {
    const m = line.match(/^\[([^\s]+)\s+"([^"]*)"\]$/);
    if (m) headers[m[1]] = m[2];
  }
  return headers;
}

function toSummary(headers, file, moveLines) {
  const site = headers.Site || '';
  const m = site.match(/lichess\.org\/([A-Za-z0-9]+)/);
  let id = m?.[1] || site;
  if (!id) {
    const finger = {
      W: headers.White || '', B: headers.Black || '', Date: headers.Date || '',
      UTCDate: headers.UTCDate || '', UTCTime: headers.UTCTime || '', Round: headers.Round || '',
      Event: headers.Event || '', Result: headers.Result || '', TC: headers.TimeControl || '',
      ECO: headers.ECO || '', Opening: headers.Opening || '',
    };
    id = toB64Safe(JSON.stringify(finger));
  }
  const parsed = parseMovetext(headers, moveLines);
  const s = {
    id,
    white: headers.White || 'Unknown',
    black: headers.Black || 'Unknown',
    result: headers.Result || '*',
    moves: parsed.moves,
    file,
  };
  if (headers.WhiteElo) s.whiteElo = parseInt(headers.WhiteElo, 10) || undefined;
  if (headers.BlackElo) s.blackElo = parseInt(headers.BlackElo, 10) || undefined;
  if (headers.Date) s.date = headers.Date;
  if (headers.TimeControl) s.timeControl = headers.TimeControl;
  if (headers.Site) s.site = headers.Site;
  if (headers.Round) s.round = headers.Round;
  if (headers.Termination) s.termination = headers.Termination;
  if (headers.ECO) s.eco = headers.ECO;
  if (headers.Opening) s.opening = headers.Opening;
  if (parsed.fen) s.fen = parsed.fen;
  if (parsed.lastMoveUci) s.lastMoveUci = parsed.lastMoveUci;
  return s;
}

function parseMovetext(headers, moveLines) {
  if (!moveLines || moveLines.length === 0) {
    return { moves: 0 };
  }
  try {
    const chess = new Chess();
    const headerText = Object.entries(headers)
      .map(([k, v]) => `[${k} "${v}"]`)
      .join('\n');
    const movetext = moveLines.join(' ').trim();
    const pgn = `${headerText}\n\n${movetext}`;
    const ok = chess.loadPgn(pgn, { sloppy: true });
    if (ok === false) return { moves: 0 };
    const hist = chess.history({ verbose: true });
    const moves = hist.length;
    const last = hist[moves - 1];
    const lastMoveUci = last
      ? `${last.from}${last.to}${last.promotion ? last.promotion : ''}`
      : undefined;
    return { moves, lastMoveUci, fen: chess.fen() };
  } catch (e) {
    return { moves: 0 };
  }
}

async function parsePgnUrl(url, max) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error('fetch failed ' + res.status + ' ' + url);
  const dec = new TextDecoder('utf-8');
  const reader = res.body.getReader();
  let buf = '';
  let headerLines = [];
  let moveLines = [];
  let inMoves = false;
  const out = [];
  const file = path.basename(new URL(url).pathname);

  const flushGame = () => {
    if (!headerLines.length) return;
    const headers = extractHeadersBlockText(headerLines);
    out.push(toSummary(headers, file, moveLines));
    headerLines = [];
    moveLines = [];
    inMoves = false;
  };

  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (let raw of lines) {
      const line = raw.trim();
      if (line.startsWith('[Event ')) {
        if (headerLines.length) {
          flushGame();
          if (max && out.length >= max) return out;
        }
        headerLines = [line];
        moveLines = [];
        inMoves = false;
        continue;
      }

      if (!inMoves && line.startsWith('[')) {
        headerLines.push(line);
        continue;
      }

      if (!inMoves && line === '') {
        inMoves = true;
        continue;
      }

      if (inMoves) {
        // 如果遇到新的 [Event ，说明上一个对局结束
        if (line.startsWith('[Event ')) {
          flushGame();
          if (max && out.length >= max) return out;
          headerLines = [line];
          moveLines = [];
          inMoves = false;
        } else {
          moveLines.push(line);
        }
      }
    }
  }
  const tail = buf.trim();
  if (tail) {
    if (inMoves) moveLines.push(tail);
    else if (tail.startsWith('[Event ')) {
      flushGame();
      headerLines = [tail];
    }
  }
  if (headerLines.length) flushGame();
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const files = [];
  const games = [];
  for (const input of args.inputs) {
    console.log('[build] parsing:', input);
    const list = await parsePgnUrl(input, args.max);
    games.push(...list);
    files.push(path.basename(new URL(input).pathname));
    console.log('[build] parsed games:', list.length);
  }
  const manifest = {
    version: 'v2',
    generatedAt: new Date().toISOString(),
    totalGames: games.length,
    files,
    games,
  };
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifest));
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(manifest)));
  fs.writeFileSync(outPath + '.gz', gz);
  console.log('[build] wrote manifest:', outPath, '(' + games.length + ' games)');
}

main().catch((e) => { console.error(e); process.exit(1); });
