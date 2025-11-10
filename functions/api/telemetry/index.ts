// POST /api/telemetry
// Accepts either a single event { name, ts, payload } or an array of such events.
// For now we just acknowledge (204). Later we can persist to R2 or log to analytics.

export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const req = ctx.request;
    const h = new Headers({ 'cache-control': 'no-store' });
    let body: any = null;
    try { body = await req.json(); } catch { body = null; }
    // Basic shape validation (best-effort)
    const ok = (val: any) => val && (typeof val.name === 'string' || Array.isArray(val));
    if (!ok(body)) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: withJson(h) });
    return new Response(null, { status: 204, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: withJson(new Headers()) });
  }
};

function withJson(h: Headers) { const hh = new Headers(h); hh.set('content-type', 'application/json; charset=utf-8'); return hh; }

