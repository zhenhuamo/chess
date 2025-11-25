import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SOURCE_TO_ENDPOINT: Record<string, string> = {
  masters: 'https://explorer.lichess.ovh/masters',
  lichess: 'https://explorer.lichess.ovh/lichess',
};

const DEFAULT_SOURCE = 'lichess';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ source: string }> },
) {
  const { source: rawSource } = await context.params;
  const source = (rawSource || DEFAULT_SOURCE).toLowerCase();
  const endpoint = SOURCE_TO_ENDPOINT[source] ?? SOURCE_TO_ENDPOINT[DEFAULT_SOURCE];

  const requestUrl = new URL(request.url);
  const targetUrl = new URL(endpoint);
  requestUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: { 'User-Agent': 'ChessAnalyzer/1.0' },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'upstream_error', status: upstream.status },
        { status: upstream.status },
      );
    }

    const body = await upstream.text();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'internal', message: error?.message || 'unknown' },
      { status: 500 },
    );
  }
}
