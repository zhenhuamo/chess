export const onRequestGet: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);

  // Determine source from path: /api/explore/lichess or /api/explore/masters
  // The function is mounted at /api/explore, so we check the path suffix or query param fallback
  let source = 'lichess';
  if (url.pathname.includes('/masters')) source = 'masters';
  else if (url.pathname.includes('/lichess')) source = 'lichess';

  const endpoint = source === 'masters'
    ? 'https://explorer.lichess.ovh/masters'
    : 'https://explorer.lichess.ovh/lichess';

  const targetUrl = new URL(endpoint);
  url.searchParams.forEach((v, k) => {
    targetUrl.searchParams.append(k, v);
  });

  try {
    const resp = await fetch(targetUrl.toString(), {
      headers: { 'User-Agent': 'ChessAnalyzer/1.0' }
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'upstream_error', status: resp.status }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.text();

    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
