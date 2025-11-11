import { GameSummary } from "../types/game";

/**
 * PGN 解析 Worker
 * 功能：流式读取 PGN 文本并提取对局头信息
 */

// 批次大小：每解析多少局发送一次
const BATCH_SIZE = 50;

// 估算的总对局数（根据文件不同）
const ESTIMATED_GAMES: Record<string, number> = {
  "lichess-4000.pgn": 50000,
  "lichess-2025-08-2000.pgn": 10000,
  "lichess-2000.pgn": 50000,
};

/**
 * 解析 PGN 头信息
 */
function parsePgnHeaders(headerText: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerText.split("\n");

  for (const line of lines) {
    // 匹配格式: [Key "Value"]
    const match = line.match(/^\[([^\s]+)\s+"([^"]*)"\]$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * 从 PGN 头信息中提取对局摘要
 */
function extractGameSummary(
  headers: Record<string, string>,
  fileName: string
): GameSummary {
  // 生成 ID（简单的 hash，v2 会使用更稳定的 SHA-256）
  const idData = `${headers.White || ""}|${headers.Black || ""}|${
    headers.Date || ""
  }|${headers.Result || ""}`;
  const id = btoa(idData).slice(0, 12);

  // 提取手数（从 Result 推断，如果没有则设为 0）
  let moves = 0;
  if (headers.Result) {
    // 无法从头信息直接获取手数，设为 0，v2 会解析实际 PGN
    moves = 0;
  }

  const summary: GameSummary = {
    id,
    white: headers.White || "Unknown",
    black: headers.Black || "Unknown",
    result: (headers.Result as GameSummary["result"]) || "*",
    moves,
    file: fileName,
  };

  // 可选字段
  if (headers.WhiteElo) summary.whiteElo = parseInt(headers.WhiteElo, 10);
  if (headers.BlackElo) summary.blackElo = parseInt(headers.BlackElo, 10);
  if (headers.Date) summary.date = headers.Date;
  if (headers.TimeControl) summary.timeControl = headers.TimeControl;
  if (headers.Site) summary.site = headers.Site;
  if (headers.Round) summary.round = headers.Round;
  if (headers.Termination) summary.termination = headers.Termination;
  if (headers.ECO) summary.eco = headers.ECO;
  if (headers.Opening) summary.opening = headers.Opening;

  return summary;
}

/**
 * 主解析函数
 */
async function parsePgnStream(
  stream: ReadableStream<Uint8Array>,
  fileName: string
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let currentHeaderText = "";
  let isReadingHeaders = false;
  const games: GameSummary[] = [];
  let totalGames = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 解码文本块
      buffer += decoder.decode(value, { stream: true });

      // 按行分割
      const lines = buffer.split("\n");
      // 保留最后一行（可能不完整）
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 如果遇到 [Event，说明是新对局的开始
        if (trimmedLine.startsWith("[Event ")) {
          // 如果之前已经读取了头信息，先处理之前的对局
          if (isReadingHeaders && currentHeaderText) {
            const headers = parsePgnHeaders(currentHeaderText);
            const game = extractGameSummary(headers, fileName);
            games.push(game);
            totalGames++;

            // 每 BATCH_SIZE 局发送一次
            if (games.length >= BATCH_SIZE) {
              self.postMessage({
                type: "batch",
                games: [...games],
              });
              games.length = 0;
            }

            // 发送进度
            const estimatedTotal = ESTIMATED_GAMES[fileName] || 10000;
            self.postMessage({
              type: "progress",
              progress: {
                current: totalGames,
                total: estimatedTotal,
                done: false,
              },
            });
          }

          // 开始新对局
          currentHeaderText = trimmedLine + "\n";
          isReadingHeaders = true;
        }
        // 如果是头信息行（以 [ 开头）
        else if (isReadingHeaders && trimmedLine.startsWith("[")) {
          currentHeaderText += trimmedLine + "\n";
        }
        // 如果遇到空行，说明头信息结束
        else if (isReadingHeaders && trimmedLine === "") {
          isReadingHeaders = false;
        }
      }
    }

    // 处理最后一个对局
    if (currentHeaderText) {
      const headers = parsePgnHeaders(currentHeaderText);
      const game = extractGameSummary(headers, fileName);
      games.push(game);
      totalGames++;
    }

    // 发送剩余的批次
    if (games.length > 0) {
      self.postMessage({
        type: "batch",
        games,
      });
    }

    // 发送完成消息
    self.postMessage({
      type: "complete",
      progress: {
        current: totalGames,
        total: totalGames,
        done: true,
      },
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    reader.releaseLock();
  }
}

/**
 * Worker 消息处理
 */
self.onmessage = async (event) => {
  const { type, fileUrl, fileName } = event.data;

  if (type === "parse") {
    try {
      // 获取文件流
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PGN file: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // 开始解析
      await parsePgnStream(response.body, fileName);
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else if (type === "stop") {
    // 停止解析（实现中）
    // 注意：ReadableStream 取消需要更好的控制
    self.postMessage({
      type: "complete",
      progress: {
        current: 0,
        total: 0,
        done: true,
      },
    });
  }
};

export {};
