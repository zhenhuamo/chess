import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const site = searchParams.get('site') || '';
    const idParam = searchParams.get('id') || '';

    // Extract lichess id from site or id param
    let id = '';
    if (site) {
        const m = site.match(/lichess\.org\/(?:game\/export\/)?([A-Za-z0-9]+)/);
        if (m) id = m[1];
    }
    if (!id && idParam) id = idParam;

    if (!id) {
        return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const upstream = `https://lichess.org/game/export/${id}.pgn?clocks=false&evals=false&opening=true`;

    try {
        const response = await fetch(upstream, {
            headers: {
                // Add User-Agent to avoid being blocked by Lichess
                'User-Agent': 'ChessAnalysis/1.0 (Local Development)',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'upstream', status: response.status }, { status: 502 });
        }

        const text = await response.text();

        return new NextResponse(text, {
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
