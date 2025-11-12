import { atom, useAtom } from "jotai";
import { GameSummary, GamesFilter, GamesManifest, ParseProgress } from "../types/game";

/**
 * Games Feed 全局状态管理
 * 使用 Jotai atoms 管理
 */

// 当前选择的文件
export const currentFileAtom = atom<string>("lichess-4000.pgn");

// 过滤器
export const gamesFilterAtom = atom<GamesFilter>({
  file: "lichess-4000.pgn",
  result: "all",
});

// 已解析的原始对局列表（所有对局，不过滤）
export const rawGamesAtom = atom<GameSummary[]>([]);

// 是否在解析中
export const isParsingAtom = atom<boolean>(false);

// 解析进度
export const parseProgressAtom = atom<ParseProgress | null>(null);

// 解析错误
export const parseErrorAtom = atom<string | null>(null);

// Worker 实例
const workerAtom = atom<Worker | null>(null);

// 派生状态：过滤后的对局列表
export const filteredGamesAtom = atom((get) => {
  const games = get(rawGamesAtom);
  const filter = get(gamesFilterAtom);

  if (filter.result === "all") {
    return games;
  }

  return games.filter((game) => {
    if (filter.result === "white") {
      return game.result === "1-0";
    }
    if (filter.result === "black") {
      return game.result === "0-1";
    }
    if (filter.result === "draw") {
      return game.result === "1/2-1/2";
    }
    return true;
  });
});

// 分页：当前页（1-based）与每页数量
export const pageAtom = atom<number>(1);
export const pageSizeAtom = atom<number>(24);

// 分页：总数量与总页数
export const totalGamesCountAtom = atom((get) => get(filteredGamesAtom).length);
export const totalPagesAtom = atom((get) => {
  const total = get(totalGamesCountAtom);
  const size = get(pageSizeAtom) || 1;
  return total > 0 ? Math.ceil(total / size) : 0;
});

// 分页：当前页的切片
export const pagedGamesAtom = atom((get) => {
  const list = get(filteredGamesAtom);
  const page = Math.max(1, get(pageAtom));
  const size = Math.max(1, get(pageSizeAtom));
  const start = (page - 1) * size;
  return list.slice(start, start + size);
});

// 派生状态：是否还有更多对局（用于无限滚动）
export const hasMoreGamesAtom = atom((get) => {
  const progress = get(parseProgressAtom);
  if (!progress) return false;
  return !progress.done;
});

// 开始解析对局
export const startParsingAtom = atom(
  null,
  async (get, set, worker: Worker) => {
    // 如果已经在解析中，不重复开始
    if (get(isParsingAtom)) return;

    // 重置状态
    set(rawGamesAtom, []);
    set(parseErrorAtom, null);
    set(isParsingAtom, true);
    set(parseProgressAtom, { current: 0, total: 10000, done: false });

    const file = get(currentFileAtom);
    // In production we are a static export on Cloudflare Pages, so Next.js app
    // route handlers under /api are not available. We proxy R2 assets via
    // Cloudflare Pages Functions mounted at /api/explore. In local dev, we keep
    // using Next.js route handlers under /api/games to avoid breaking DX.
    const apiBase = process.env.NODE_ENV === 'production' ? '/api/explore' : '/api/games';
    const fileUrl = `${apiBase}/stream?file=${encodeURIComponent(file)}`;

    // Fast path (v2): try manifest first; fallback to streaming worker.
    // Manifest is proxied at /api/explore/manifest in production. If unavailable
    // (404/5xx), we silently fall back to the streaming parser.
    try {
      const manifestResp = await fetch('/api/explore/manifest', { cache: 'reload' });
      if (manifestResp.ok) {
        const manifest = (await manifestResp.json()) as GamesManifest;
        if (manifest?.version === 'v2' && Array.isArray(manifest.games)) {
          // Show all games from the manifest (combine across files)
          const list = manifest.games;
          if (list.length > 0) {
            // Use prebuilt summaries; no need to start the worker.
            set(rawGamesAtom, list as GameSummary[]);
            set(parseProgressAtom, { current: list.length, total: list.length, done: true });
            set(isParsingAtom, false);
            return; // early exit – manifest served our data
          }
        }
      }
    } catch {
      // ignore and fall back to worker
    }

    // 设置 Worker 消息处理
    worker.onmessage = (event) => {
      const { type, games, progress, error } = event.data;
      // Debug logs to help verify streaming parser behavior
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[games/worker] message", type, {
          batch: games?.length,
          progress,
          error,
        });
      }

      switch (type) {
        case "batch":
          // 追加新批次
          set(rawGamesAtom, (prev) => [...prev, ...games]);
          break;

        case "progress":
          // 更新进度
          set(parseProgressAtom, progress);
          break;

        case "complete":
          // 解析完成
          set(isParsingAtom, false);
          set(parseProgressAtom, progress);
          break;

        case "error":
          // 解析错误
          set(isParsingAtom, false);
          set(parseErrorAtom, error);
          break;
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      set(isParsingAtom, false);
      set(parseErrorAtom, "Worker error occurred");
    };

    // 发送解析请求
    worker.postMessage({
      type: "parse",
      fileUrl,
      fileName: file,
    });
  }
);

// 停止解析
export const stopParsingAtom = atom(null, (get, set, worker: Worker) => {
  set(isParsingAtom, false);
  worker.postMessage({ type: "stop" });
});

// 重置所有状态
export const resetGamesAtom = atom(null, (get, set) => {
  set(rawGamesAtom, []);
  set(isParsingAtom, false);
  set(parseProgressAtom, null);
  set(parseErrorAtom, null);
});

/**
 * 自定义 Hook：使用 Games 状态
 */
export function useGamesState() {
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [filter, setFilter] = useAtom(gamesFilterAtom);
  const [games] = useAtom(pagedGamesAtom);
  const [totalGames] = useAtom(totalGamesCountAtom);
  const [totalPages] = useAtom(totalPagesAtom);
  const [page, setPage] = useAtom(pageAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);
  const [isParsing] = useAtom(isParsingAtom);
  const [progress] = useAtom(parseProgressAtom);
  const [error] = useAtom(parseErrorAtom);
  const [hasMore] = useAtom(hasMoreGamesAtom);

  const [, startParsing] = useAtom(startParsingAtom);
  const [, stopParsing] = useAtom(stopParsingAtom);
  const [, reset] = useAtom(resetGamesAtom);

  return {
    currentFile,
    setCurrentFile,
    filter,
    setFilter,
    games,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalGames,
    totalPages,
    isParsing,
    progress,
    error,
    hasMore,
    startParsing,
    stopParsing,
    reset,
  };
}
