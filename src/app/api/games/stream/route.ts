import { NextRequest, NextResponse } from "next/server";

// 本地开发用的代理 API
// 复用现有的 /functions/api/explore/stream.ts 逻辑

const ALLOW_LIST: Record<string, string> = {
  "lichess-4000.pgn": "https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn",
  "lichess-2025-08-2000.pgn": "https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn",
  "lichess-2000.pgn": "https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file")?.trim() || "";

    if (!file || !ALLOW_LIST[file]) {
      return NextResponse.json(
        { error: "invalid_file" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    const target = ALLOW_LIST[file];
    const response = await fetch(target, {
      cf: { cacheTtl: 0, cacheEverything: false } as any,
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "upstream_error", status: response.status },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }

    // 返回流式响应
    return new Response(response.body, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "internal",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
