// GET /api/g/:id   -> returns stored JSON (or raw PGN with ?format=raw)
// HEAD /api/g/:id  -> existence check with cache headers

export const onRequest: PagesFunction<{ SHARE: R2Bucket } & Record<string, any>> = async (ctx) => {
  const req = ctx.request;
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() || '';
  if (!/^[0-9a-zA-Z]{6,32}$/.test(id)) {
    return json({ error: 'invalid_id' }, { status: 400, headers: cacheHeaders() });
  }
  const key = `g/${id.slice(0, 2)}/${id}.json`;

  // HEAD → existence and headers only
  if (req.method === 'HEAD') {
    const head = await ctx.env.SHARE.head(key);
    if (!head) return new Response(null, { status: 404, headers: cacheHeaders() });
    return new Response(null, { status: 200, headers: cacheHeaders() });
  }

  // Enforce GET
  if (req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, { status: 405, headers: cacheHeaders({ allow: 'GET, HEAD' }) });
  }

  const obj = await ctx.env.SHARE.get(key);
  if (!obj) return json({ error: 'not_found' }, { status: 404, headers: cacheHeaders() });

  const h = cacheHeaders();
  // ETag: weak SHA-1 of bytes
  const etag = await sha1Hex(obj);
  h.set('etag', `W/"${etag}"`);

  if ((url.searchParams.get('format') || '').toLowerCase() === 'raw') {
    try {
      const parsed = JSON.parse(obj);
      const pgn = (parsed?.pgn ?? '').toString();
      h.set('content-type', 'text/plain; charset=utf-8');
      return new Response(pgn, { status: 200, headers: h });
    } catch {
      return json({ error: 'corrupt' }, { status: 500, headers: h });
    }
  }

  return new Response(obj, { status: 200, headers: withContentType(h, 'application/json; charset=utf-8') });
};

function JSONResponse(body: any, init?: ResponseInit) { return new Response(JSON.stringify(body), { ...(init || {}), headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers || {}) } }); }
const json = JSONResponse;

function cacheHeaders(extra?: Record<string, string>): Headers {
  const h = new Headers();
  h.set('cache-control', 'public, immutable, max-age=31536000');
  if (extra?.allow) h.set('allow', extra.allow);
  return h;
}
function withContentType(h: Headers, ct: string): Headers {
  const out = new Headers(h);
  out.set('content-type', ct);
  return out;
}

async function sha1Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-1', bytes);
  const arr = new Uint8Array(buf);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

