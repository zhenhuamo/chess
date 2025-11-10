// Optional manifest proxy – will return 404 until you upload manifest to R2 and point here.
// For now, return 404 with a simple JSON so the frontend can fall back to stream mode.

export const onRequestGet: PagesFunction = async () => {
  const body = { error: 'manifest_not_available', fallback: 'use_stream' };
  return new Response(JSON.stringify(body), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
};

