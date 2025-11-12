// Cloudflare Pages Function: Proxy Lichess game PGN export to same-origin
// Usage: /api/games/pgn?id=<lichessId> or /api/games/pgn?site=https%3A%2F%2Flichess.org%2F<id>

export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const site = url.searchParams.get('site') || '';
    const idParam = url.searchParams.get('id') || '';

    // Extract lichess id from site or id param
    let id = '';
    if (site) {
      const m = site.match(/lichess\.org\/(?:game\/export\/)?([A-Za-z0-9]+)/);
      if (m) id = m[1];
    }
    if (!id && idParam) id = idParam;

    if (!id) {
      return json({ error: 'invalid_id' }, 400);
    }

    const upstream = `https://lichess.org/game/export/${id}.pgn?clocks=false&evals=false&opening=true`;
    const resp = await fetch(upstream, { cf: { cacheTtl: 0, cacheEverything: false } });
    if (!resp.ok) {
      return json({ error: 'upstream', status: resp.status }, 502);
    }
    const text = await resp.text();
    return new Response(text, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    return json({ error: 'internal', message: e?.message || 'unknown' }, 500);
  }
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

