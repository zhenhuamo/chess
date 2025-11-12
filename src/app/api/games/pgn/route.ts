import { NextRequest, NextResponse } from "next/server";

// 代理从 lichess 导出 PGN，避免浏览器跨域问题
// 用法：/api/games/pgn?site=https%3A%2F%2Flichess.org%2F<id>
// 或 /api/games/pgn?id=<id>

export const dynamic = "force-static"; // 与 output: export 兼容

function extractId(site: string | null): string | null {
  if (!site) return null;
  const m = site.match(/lichess\.org\/(?:game\/export\/)?([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || extractId(url.searchParams.get("site"));
    if (!id || !/^[A-Za-z0-9]+$/.test(id)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400, headers: { "cache-control": "no-store" } });
    }

    const upstream = `https://lichess.org/game/export/${id}.pgn?clocks=false&evals=false&opening=true`;
    const resp = await fetch(upstream);
    if (!resp.ok) {
      return NextResponse.json({ error: "upstream", status: resp.status }, { status: 502, headers: { "cache-control": "no-store" } });
    }
    const text = await resp.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "internal", message: e?.message || "unknown" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}

