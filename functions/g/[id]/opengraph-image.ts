// GET /g/:id/opengraph-image
// Generates a 1200x630 PNG social image for the shared game.
// v2: Render the real final position from PGN (FEN) with actual pieces from /public/piece/<set>.

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { Chess } from 'chess.js';

export const onRequestGet: PagesFunction<{ SHARE: R2Bucket }> = async (ctx) => {
  try {
    const req = ctx.request;
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // .../g/:id/opengraph-image -> the id is at -2
    const id = String(parts[parts.length - 2] || '').trim();
    if (!/^[0-9a-zA-Z]{6,32}$/.test(id)) {
      return new Response('invalid id', { status: 400 });
    }

    // Load game metadata
    const key = `g/${id.slice(0,2)}/${id}.json`;
    const obj = await ctx.env.SHARE.get(key);
    if (!obj) return new Response('not found', { status: 404 });
    const { pgn } = JSON.parse(await obj.text());

    // Parse headers for text blocks
    const hdr = parsePgnHeaders(String(pgn || ''));
    const white = hdr.White || 'White';
    const black = hdr.Black || 'Black';
    const date = hdr.Date || '';
    const event = hdr.Event || '';
    const result = hdr.Result || '';

    const title = `${white} vs ${black}`;
    const sub = [event, date].filter(Boolean).join(' · ');
    const foot = [result || '', id].filter(Boolean).join(' · ');

    // Build final position from PGN
    const game = new Chess();
    try { game.loadPgn(String(pgn || '')); } catch {}
    const fen = game.fen();
    const verbose = game.history({ verbose: true }) as Array<{ from: string; to: string; san: string }>;
    const last = verbose.at(-1) || null;

    // Build SVG with real pieces
    const origin = `${url.protocol}//${url.host}`;
    let svg: string;
    try {
      svg = await buildSvgWithBoard({ title, sub, foot, fen, assetOrigin: origin, pieceSet: 'cburnett', highlight: last ? { from: last.from, to: last.to } : undefined });
    } catch {
      // Fallback to text-only motif if piece assets fail to load
      svg = buildSvg({ title, sub, foot });
    }

    // Render to PNG using resvg
    await initWasm(wasm as unknown as ArrayBuffer);
    const r = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    const png = r.render().asPng();

    const h = new Headers();
    h.set('content-type', 'image/png');
    h.set('cache-control', 'public, immutable, max-age=31536000');
    return new Response(png, { status: 200, headers: h });
  } catch (e: any) {
    return new Response('internal', { status: 500 });
  }
};

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function parsePgnHeaders(pgn: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = pgn.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*\[([^\s\]]+)\s+"([^"]*)"\s*\]\s*$/);
    if (m) out[m[1]] = m[2];
    else if (line.trim() === '') break;
  }
  return out;
}

// Fallback simple SVG (no actual pieces)
function buildSvg({ title, sub, foot }: { title: string; sub: string; foot: string; }) {
  const W = 1200, H = 630;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#g)"/>
  <text x="60" y="220" font-size="72" fill="#e2e8f0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="700">${esc(title)}</text>
  <text x="60" y="290" font-size="36" fill="#a0aec0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="500">${esc(sub)}</text>
  <text x="60" y="580" font-size="28" fill="#a0aec0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif">${esc(foot)}</text>
  ${renderBoardMotif(780, 120, 420)}
</svg>`;
}

function renderBoardMotif(x: number, y: number, size: number): string {
  const cells: string[] = [];
  const cell = Math.floor(size / 8);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const dark = (r + c) % 2 === 1;
      const fill = dark ? '#223042' : '#cbd5e1';
      cells.push(`<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="${fill}" rx="2" ry="2"/>`);
    }
  }
  cells.push(`<rect x="${x - 8}" y="${y - 8}" width="${cell * 8 + 16}" height="${cell * 8 + 16}" fill="none" stroke="#47a3ff" stroke-width="6" opacity="0.7"/>`);
  return cells.join('\n');
}

// Build full SVG with real board and pieces rendered from FEN.
async function buildSvgWithBoard(opts: {
  title: string; sub: string; foot: string; fen: string; assetOrigin: string; pieceSet: string; highlight?: { from: string; to: string };
}): Promise<string> {
  const { title, sub, foot, fen, assetOrigin, pieceSet, highlight } = opts;
  const W = 1200, H = 630;
  const boardX = 700, boardY = 50, boardSize = 560; // large board area
  const cell = Math.floor(boardSize / 8);

  const defs = `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1220"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
    </defs>`;

  const titleBlock = `
    <text x="60" y="200" font-size="72" fill="#e2e8f0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="700">${esc(title)}</text>
    <text x="60" y="270" font-size="36" fill="#a0aec0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="500">${esc(sub)}</text>
    <text x="60" y="570" font-size="28" fill="#a0aec0" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif">${esc(foot)}</text>`;

  const boardSquares = renderBoardSquares(boardX, boardY, boardSize);
  const piecesLayer = await renderPiecesFromFen(fen, boardX, boardY, cell, assetOrigin, pieceSet);
  const highlightLayer = highlight ? renderHighlight(boardX, boardY, cell, highlight.from, highlight.to) : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#g)"/>
  ${titleBlock}
  ${boardSquares}
  ${piecesLayer}
  ${highlightLayer}
</svg>`;
}

function renderBoardSquares(x: number, y: number, size: number): string {
  const cell = Math.floor(size / 8);
  const els: string[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const dark = (r + c) % 2 === 1;
      const fill = dark ? '#223042' : '#cbd5e1';
      els.push(`<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`);
    }
  }
  els.push(`<rect x="${x - 8}" y="${y - 8}" width="${cell * 8 + 16}" height="${cell * 8 + 16}" fill="none" stroke="#47a3ff" stroke-width="6" opacity="0.7"/>`);
  return els.join('\n');
}

async function renderPiecesFromFen(fen: string, x: number, y: number, cell: number, origin: string, set: string): Promise<string> {
  const pos = fen.split(' ')[0];
  const rows = pos.split('/');
  const board: (null | { type: string; color: 'w' | 'b' })[][] = [];
  for (const row of rows) {
    const arr: (null | { type: string; color: 'w' | 'b' })[] = [];
    for (const ch of row) {
      if (/[1-8]/.test(ch)) { const n = Number(ch); for (let i = 0; i < n; i++) arr.push(null); }
      else {
        const isUpper = ch === ch.toUpperCase();
        arr.push({ color: isUpper ? 'w' : 'b', type: ch.toLowerCase() });
      }
    }
    board.push(arr);
  }

  const kinds = new Set<string>();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) kinds.add(`${p.color}${p.type}`);
    }
  }

  const cache: Record<string, string> = {};
  for (const k of kinds) cache[k] = await fetchPieceDataUri(origin, set, k);

  const els: string[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const key = `${p.color}${p.type}`;
      const href = cache[key];
      const px = x + c * cell;
      const py = y + r * cell;
      const pad = Math.round(cell * 0.05);
      els.push(`<image x="${px + pad}" y="${py + pad}" width="${cell - 2 * pad}" height="${cell - 2 * pad}" href="${href}"/>`);
    }
  }
  return els.join('\n');
}

async function fetchPieceDataUri(origin: string, set: string, key: string): Promise<string> {
  const color = key[0] === 'w' ? 'w' : 'b';
  const t = key[1];
  const map: Record<string, string> = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
  const file = `${color}${map[t]}.svg`;
  const url = `${origin}/piece/${set}/${file}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('piece fetch failed');
  const svg = await resp.text();
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

function sqToRC(sq: string): { r: number; c: number } {
  // a1 -> r=7,c=0 ; a8 -> r=0,c=0 ; h1 -> r=7,c=7
  const file = sq[0]?.toLowerCase() || 'a';
  const rank = Number(sq[1] || '1');
  const c = Math.max(0, Math.min(7, file.charCodeAt(0) - 'a'.charCodeAt(0)));
  const r = Math.max(0, Math.min(7, 8 - rank));
  return { r, c };
}

function renderHighlight(x: number, y: number, cell: number, from: string, to: string): string {
  const a = sqToRC(from), b = sqToRC(to);
  const fx = x + a.c * cell, fy = y + a.r * cell;
  const tx = x + b.c * cell, ty = y + b.r * cell;
  const pad = Math.round(cell * 0.06);
  const overlays = [
    `<rect x="${fx + pad}" y="${fy + pad}" width="${cell - 2*pad}" height="${cell - 2*pad}" fill="#fcd34d" fill-opacity="0.35" stroke="#f59e0b" stroke-width="3" rx="6" ry="6"/>`,
    `<rect x="${tx + pad}" y="${ty + pad}" width="${cell - 2*pad}" height="${cell - 2*pad}" fill="#86efac" fill-opacity="0.35" stroke="#10b981" stroke-width="3" rx="6" ry="6"/>`,
  ];
  // Arrow from center of from -> to
  const cx1 = fx + cell/2, cy1 = fy + cell/2;
  const cx2 = tx + cell/2, cy2 = ty + cell/2;
  const arrow = `
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
      </marker>
    </defs>
    <line x1="${cx1}" y1="${cy1}" x2="${cx2}" y2="${cy2}" stroke="#10b981" stroke-width="6" stroke-opacity="0.8" marker-end="url(#arrow)" />`;
  return overlays.join('\n') + '\n' + arrow;
}
