// Optional index proxy – expects version param and would proxy to R2 when available.
// For now returns 404 so frontend falls back to stream mode.

// Proxies the Explore prebuilt index JSON from R2 (cacle domain) to same-origin.
// Accepts either ?url=<absolute-url> or ?version=<id> (not implemented in v1).

export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const direct = url.searchParams.get('url');
    let target = direct;
    if (!target) {
      // Optional: could resolve by version via manifest; for v1 require url
      return new Response(JSON.stringify({ error: 'missing_url' }), { status: 400, headers: jsonNoStore() });
    }
    // Basic allow-list: only allow cacle.chess-analysis.org domain
    try {
      const tu = new URL(target);
      if (!/\.chess-analysis\.org$/i.test(tu.hostname)) throw new Error('forbidden_host');
    } catch { return new Response(JSON.stringify({ error: 'invalid_url' }), { status: 400, headers: jsonNoStore() }); }

    const upstream = await fetch(target, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: 'upstream_error', status: upstream.status }), { status: 502, headers: jsonNoStore() });
    }
    // Pass through body and key headers
    const h = new Headers();
    // content-encoding might be gzip; let browser handle it
    const ce = upstream.headers.get('content-encoding'); if (ce) h.set('content-encoding', ce);
    h.set('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    h.set('cache-control', 'public, immutable, max-age=31536000');
    const et = upstream.headers.get('etag'); if (et) h.set('etag', et);
    return new Response(upstream.body, { status: 200, headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'internal', message: e?.message || 'unknown' }), { status: 500, headers: jsonNoStore() });
  }
};

function jsonNoStore() { return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }; }
