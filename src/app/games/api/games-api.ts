import { GameSummary } from "../types/game";
import { Chess } from "chess.js";
import { openDB } from "idb";
import { formatGameToDatabase, setGameHeaders } from "@/src/lib/chess";

/**
 * Games API 客户端
 * 提供与后端 API 交互的方法
 */

// Note: The site is exported statically (next export) and deployed to
// Cloudflare Pages. That means Next.js route handlers under /api are not
// available in production. We host equivalent endpoints as Cloudflare Pages
// Functions under /api/explore. Use that in production, and keep /api/games in
// local dev so existing Next.js route handlers work.
const API_BASE = process.env.NODE_ENV === 'production' ? '/api/explore' : '/api/games';

/**
 * 获取 PGN 文件流（用于 Worker 解析）
 */
export async function streamGames(
  fileName: string
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE}/stream?file=${encodeURIComponent(fileName)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  return response.body;
}

/**
 * 打开对局到 Analyzer
 * 流程：获取 PGN → 保存到 IndexedDB → 跳转到 Analyzer
 */
export async function openInAnalyzer(game: GameSummary): Promise<string> {
  try {
    // 直接写入 IndexedDB，返回 /analyze?gameId=<numericId>
    const pgn = await fetchGamePgn(game);

    const chess = new Chess();
    const ok = (() => { try { return chess.loadPgn(pgn); } catch { return false; } })();
    // 补齐/规范化头信息（避免缺省导致 UI 信息缺失）
    try {
      setGameHeaders(chess, {
        white: { name: game.white, rating: game.whiteElo },
        black: { name: game.black, rating: game.blackElo },
      });
    } catch { }

    const db = await openDB("games", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("games")) {
          db.createObjectStore("games", { keyPath: "id", autoIncrement: true });
        }
      },
    });

    const rec: any = {
      ...(formatGameToDatabase(chess) as any),
      pgn, // 保留原始 PGN 文本，避免二次格式化丢失内容
      playerSide: "w",
      origin: "games",
      engineVariant: "sf17-lite",
    };

    const id = (await db.add("games", rec)) as unknown as number;

    return `/analyze?gameId=${id}`;
  } catch (error) {
    console.error("Failed to open game in analyzer:", error);
    throw error;
  }
}

/**
 * 获取对局的完整 PGN 文本
 * v1: 使用 share 链接（实际应用中需要更高效的方案）
 * v2: 使用 file + offset + length 从 R2 获取
 */
export async function fetchGamePgn(game: GameSummary): Promise<string> {
  // 首选：从 lichess 对局号导出（本域代理，避免跨域）
  if (game.site) {
    const m = game.site.match(/lichess\.org\/([A-Za-z0-9]+)/);
    const id = m?.[1];
    if (id) {
      try {
        const res = await fetch(`/api/games/pgn?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          if (text && /\n\n/.test(text)) return text;
        }
      } catch { }
    }
  }
  // 兜底：用头信息构造极简 PGN（无走法），以保证分析页至少可打开
  return createTempHeadersOnlyPgn(game);
}

/**
 * 分享对局
 */
export async function shareGame(game: GameSummary): Promise<string> {
  const pgn = await fetchGamePgn(game);

  const response = await fetch("/api/g", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pgn }),
  });

  if (!response.ok) {
    throw new Error(`Failed to share game: ${response.statusText}`);
  }

  const { id } = (await response.json()) as any;
  const shareUrl = `${window.location.origin}/g/${id}`;

  // 复制到剪贴板
  await navigator.clipboard.writeText(shareUrl);

  return shareUrl;
}

/**
 * 复制 PGN 到剪贴板
 */
export async function copyPgn(game: GameSummary): Promise<string> {
  const pgn = await fetchGamePgn(game);

  await navigator.clipboard.writeText(pgn);

  return pgn;
}

/**
 * 创建临时 PGN（仅用于测试和演示）
 * TODO: 替换为实际从数据库/R2 获取的逻辑
 */
function createTempHeadersOnlyPgn(game: GameSummary): string {
  const headers = [
    `[Event "?"]`,
    `[Site "${game.site || "?"}"]`,
    `[Date "${game.date || "????.??.??"}"]`,
    `[White "${game.white}"]`,
    `[Black "${game.black}"]`,
    game.whiteElo ? `[WhiteElo "${game.whiteElo}"]` : null,
    game.blackElo ? `[BlackElo "${game.blackElo}"]` : null,
    game.timeControl ? `[TimeControl "${game.timeControl}"]` : null,
    game.round ? `[Round "${game.round}"]` : null,
    game.eco ? `[ECO "${game.eco}"]` : null,
    game.opening ? `[Opening "${game.opening}"]` : null,
    `[Result "${game.result}"]`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${headers}\n\n*\n`;
}

/**
 * 生成对局分享链接
 */
export function generateShareUrl(gameId: string): string {
  return `${window.location.origin}/g/${gameId}`;
}

/**
 * 从分享链接提取 ID
 */
export function extractGameId(shareUrl: string): string | null {
  const match = shareUrl.match(/\/g\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
