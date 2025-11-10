// Optional manifest proxy – will return 404 until you upload manifest to R2 and point here.
// For now, return 404 with a simple JSON so the frontend can fall back to stream mode.

// Proxies the Explore manifest from R2 (cacle domain) to same-origin.
// Env override: EXPL_MANIFEST_URL
const DEFAULT_MANIFEST_URL = 'https://cacle.chess-analysis.org/explore/explore-manifest.json';

export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const target = (ctx.env as any)?.EXPL_MANIFEST_URL || DEFAULT_MANIFEST_URL;
    const resp = await fetch(target, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!resp.ok) return new Response(JSON.stringify({ error: 'upstream_error', status: resp.status }), { status: 502, headers: jsonNoStore() });
    const body = await resp.text();
    const h = new Headers();
    h.set('content-type', 'application/json; charset=utf-8');
    h.set('cache-control', 'public, max-age=3600');
    const et = resp.headers.get('etag'); if (et) h.set('etag', et);
    return new Response(body, { status: 200, headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'internal', message: e?.message || 'unknown' }), { status: 500, headers: jsonNoStore() });
  }
};

function jsonNoStore() { return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }; }
