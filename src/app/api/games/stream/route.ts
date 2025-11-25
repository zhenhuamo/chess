import { NextRequest, NextResponse } from 'next/server';
import { STREAM_ALLOW_LIST } from '../../explore/streamAllowList';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const file = searchParams.get('file');

    if (!file || !STREAM_ALLOW_LIST[file]) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
    }

    const target = STREAM_ALLOW_LIST[file];

    try {
        const response = await fetch(target);
        if (!response.ok) {
            return NextResponse.json({ error: 'upstream_error', status: response.status }, { status: 502 });
        }

        // Pass through the stream
        return new NextResponse(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'internal', message: error.message }, { status: 500 });
    }
}
