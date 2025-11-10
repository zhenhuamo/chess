// Optional index proxy – expects version param and would proxy to R2 when available.
// For now returns 404 so frontend falls back to stream mode.

export const onRequestGet: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const v = url.searchParams.get('version') || '';
  const body = { error: 'index_not_available', version: v, fallback: 'use_stream' };
  return new Response(JSON.stringify(body), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
};

