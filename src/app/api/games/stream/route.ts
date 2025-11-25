import { NextRequest, NextResponse } from 'next/server';

const ALLOW_LIST: Record<string, string> = {
    'lichess-4000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn',
    'lichess-2025-08-2000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn',
    'lichess-2000.pgn': 'https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn',
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const file = searchParams.get('file');

    if (!file || !ALLOW_LIST[file]) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
    }

    const target = ALLOW_LIST[file];

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
