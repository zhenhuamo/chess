import { GameSummary } from "../types/game";

/**
 * Games API 客户端
 * 提供与后端 API 交互的方法
 */

const API_BASE = "/api/games";

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
    // v1: 直接从 share 接口获取（简化的方式）
    // v2: 使用 offset/length 从 R2 获取
    const pgn = await fetchGamePgn(game);

    // 保存到 /api/g（获取分享 ID）
    const response = await fetch("/api/g", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pgn }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save game: ${response.statusText}`);
    }

    const { id } = await response.json();

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
  // v1 简化实现：使用 share ID 获取（需要先有 share ID）
  // 在实际场景中，你可能需要：
  // 1. 如果已有 shareUrl，直接提取 ID
  // 2. 如果没有，调用 /api/g 创建
  // 3. 或者 v2 方案：从 R2 读取指定范围

  // 这里简化：调用 /api/g 创建分享，然后返回 PGN
  // 注意：这会导致两次网络请求，v2 应该优化

  // 临时方案：返回一个简单的 PGN（仅用于测试）
  // 实际应该调用 /api/g/[id] 获取完整 PGN

  // TODO: 实际实现
  const tempPgn = createTempPgn(game);
  return tempPgn;
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

  const { id } = await response.json();
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
function createTempPgn(game: GameSummary): string {
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

  // 临时走法（简化）
  const moves =
    "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7";

  return `${headers}\n\n${moves} ${game.result}\n`;
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
