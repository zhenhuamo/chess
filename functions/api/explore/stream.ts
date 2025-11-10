// Proxy R2-hosted PGN files to same-origin to avoid CORS and enable simple cache control.
// Usage: GET /api/explore/stream?file=<key>
// Only whitelisted files are allowed (to prevent abuse).

const ALLOW_LIST: Record<string, string> = {
  'lichess-4000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn',
  'lichess-2025-08-2000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn',
  'lichess-2000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn',
};

export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const key = (url.searchParams.get('file') || '').trim();
    if (!key || !ALLOW_LIST[key]) {
      return new Response(JSON.stringify({ error: 'invalid_file' }), { status: 400, headers: jsonHeadersNoStore() });
    }
    const target = ALLOW_LIST[key];
    const resp = await fetch(target, { cf: { cacheTtl: 0, cacheEverything: false } });
    if (!resp.ok || !resp.body) {
      return new Response(JSON.stringify({ error: 'upstream_error', status: resp.status }), { status: 502, headers: jsonHeadersNoStore() });
    }
    const h = new Headers(resp.headers);
    h.set('cache-control', 'no-store');
    h.set('content-type', 'text/plain; charset=utf-8');
    return new Response(resp.body, { status: 200, headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'internal', message: e?.message || 'unknown' }), { status: 500, headers: jsonHeadersNoStore() });
  }
};

function jsonHeadersNoStore() {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
}

