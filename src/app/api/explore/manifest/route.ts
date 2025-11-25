import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const DEFAULT_MANIFEST_URL = 'https://cacle.chess-analysis.org/explore/explore-manifest.json';

export async function GET(request: NextRequest) {
  const target = process.env.EXPL_MANIFEST_URL || DEFAULT_MANIFEST_URL;
  const fileParam = request.nextUrl.searchParams.get('file') || '';
  const file = fileParam ? fileParam.split('/').pop() || '' : '';

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'ChessAnalyzer/1.0' },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'upstream_error', status: upstream.status },
        { status: 502, headers: noStoreJsonHeaders() },
      );
    }

    const body = await upstream.text();
    const filtered = filterManifest(body, file);
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'public, max-age=3600');
    const etag = upstream.headers.get('etag');
    if (etag) headers.set('ETag', etag);

    return new NextResponse(filtered, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'internal', message: error?.message || 'unknown' },
      { status: 500, headers: noStoreJsonHeaders() },
    );
  }
}

function noStoreJsonHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
}

function filterManifest(body: string, file: string) {
  if (!file) return body;
  try {
    const data = JSON.parse(body);
    if (!data || !Array.isArray(data.games)) return body;
    const games = data.games.filter((g: any) => g?.file === file);
    const subset = {
      ...data,
      files: [file],
      totalGames: games.length,
      games,
    };
    return JSON.stringify(subset);
  } catch {
    return body;
  }
}
