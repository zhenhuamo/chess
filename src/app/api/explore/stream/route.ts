import { NextRequest, NextResponse } from 'next/server';
import { STREAM_ALLOW_LIST } from '../streamAllowList';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const file = (request.nextUrl.searchParams.get('file') || '').trim();
  if (!file || !STREAM_ALLOW_LIST[file]) {
    return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
  }

  try {
    const upstream = await fetch(STREAM_ALLOW_LIST[file]);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: 'upstream_error', status: upstream.status },
        { status: 502 },
      );
    }

    const headers = new Headers(upstream.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-store');

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'internal', message: error?.message || 'unknown' },
      { status: 500 },
    );
  }
}
