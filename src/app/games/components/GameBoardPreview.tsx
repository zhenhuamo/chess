"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { GameSummary } from "../types/game";
import { getEvaluateGameParams } from "@/src/lib/chess";

type BestMove = { from: string; to: string; uci: string } | null;

interface Props {
  game: GameSummary;
}

// 轻量 PGN 获取：优先从 lichess Site 导出；失败则回退到仅头信息的最小 PGN
async function fetchPgnForGame(game: GameSummary): Promise<string> {
  const site = game.site || "";
  const m = site.match(/lichess\.org\/([A-Za-z0-9]+)/);
  if (m && m[1]) {
    const id = m[1];
    try {
      // 优先走本域代理，避免跨域与 COEP 限制
      const url = `/api/games/pgn?id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        if (text && /\n\n/.test(text)) return text;
      }
    } catch {}
  }

  // 回退：用头信息构造一个极简 PGN（仅用于展示棋盘初始位与按钮）
  const headers = [
    `[Event "${game.opening || "?"}"]`,
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

// 简单缓存（同一页面会话）：避免重复请求与重复计算
const pgnCache = new Map<string, string>(); // key: lichessId 或 game.id
const bestMoveCache = new Map<string, string>(); // key: `${analysisFen}` -> uci

// 与 /public/engines/stockfish-worker.js 对话的最简封装（单例）
const engineSingleton = (() => {
  let worker: Worker | null = null;
  const ensure = () => {
    if (worker) return worker;
    worker = new Worker("/engines/stockfish-worker.js");
    worker.postMessage({ type: "init" });
    return worker;
  };
  const analyze = (fen: string, depth = 12): Promise<string> => {
    const w = ensure();
    return new Promise((resolve, reject) => {
      const onMsg = (e: MessageEvent) => {
        const data = e.data || {};
        if (data?.type === "analysis" && data?.payload?.bestMove) {
          w.removeEventListener("message", onMsg);
          resolve(String(data.payload.bestMove));
        } else if (data?.type === "error") {
          w.removeEventListener("message", onMsg);
          reject(new Error(String(data.message)));
        }
      };
      w.addEventListener("message", onMsg);
      w.postMessage({ type: "analyze", fen, depth });
      // 超时兜底
      setTimeout(() => {
        try { w.removeEventListener("message", onMsg); } catch {}
        reject(new Error("engine_timeout"));
      }, 7000);
    });
  };
  const stop = () => { try { ensure().postMessage({ type: "stop" }); } catch {} };
  return { analyze, stop };
})();

export default function GameBoardPreview({ game }: Props) {
  const [fen, setFen] = useState<string | null>(null); // 预览使用的棋盘局面（默认最终局面）
  const [analysisFen, setAnalysisFen] = useState<string | null>(null); // 用于计算最佳着法的局面（通常为最后一步之前）
  const [lastMove, setLastMove] = useState<BestMove>(null); // 最后一步（用于默认箭头）
  const [bestMove, setBestMove] = useState<BestMove>(null); // 悬停时引擎给出的最佳着法
  const [hovered, setHovered] = useState(false);
  const loadingRef = useRef(false);

  // 测量容器宽度，保证棋盘不被裁剪（正方形区域）
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [boardWidth, setBoardWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setBoardWidth(w > 0 ? w : undefined);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const arrows = useMemo(() => {
    if (hovered && bestMove) return [[bestMove.from, bestMove.to]] as [string, string][];
    if (lastMove) return [[lastMove.from, lastMove.to]] as [string, string][];
    return [] as [string, string][];
  }, [bestMove, lastMove, hovered]);

  const loadFen = useCallback(async () => {
    if (loadingRef.current || fen) return;
    loadingRef.current = true;
    try {
      // 缓存 key：优先 lichess 对局号，否则使用摘要 id
      const site = game.site || "";
      const match = site.match(/lichess\.org\/([A-Za-z0-9]+)/);
      const cacheKey = match?.[1] || game.id;
      let pgn = pgnCache.get(cacheKey);
      if (!pgn) {
        pgn = await fetchPgnForGame(game);
        pgnCache.set(cacheKey, pgn);
      }
      const chess = new Chess();
      chess.loadPgn(pgn);
      const params = getEvaluateGameParams(chess);
      const total = params.fens.length;
      // 最终局面用作预览
      const finalFen = total > 0 ? params.fens[total - 1] : chess.fen();
      setFen(finalFen);
      // 最后一手（用于默认箭头）
      if (params.uciMoves.length > 0) {
        const uci = params.uciMoves[params.uciMoves.length - 1];
        setLastMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), uci });
      }
      // 用于分析的局面：最后一手之前（能得到“下一步”）
      const idx = Math.max(0, total - 2);
      setAnalysisFen(params.fens[idx] || finalFen);
    } catch {
      // 回退到起始位（无历史）
      const start = new Chess().fen();
      setFen(start);
      setAnalysisFen(start);
    } finally {
      loadingRef.current = false;
    }
  }, [game, fen]);

  // 开发期日志，便于排查“为何仍是开局”
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[preview]", { id: game.id, fen, analysisFen, lastMove, bestMove });
    }
  }, [fen, analysisFen, lastMove, bestMove, game.id]);

  const computeBestMove = useCallback(async () => {
    if (!analysisFen || bestMove) return;
    try {
      const cached = bestMoveCache.get(analysisFen);
      let uci = cached;
      if (!uci) {
        uci = await engineSingleton.analyze(analysisFen, 12);
        if (uci) bestMoveCache.set(analysisFen, uci);
      }
      if (!uci || uci === "(none)") return;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      setBestMove({ from, to, uci });
    } catch {
      /* no-op */
    }
  }, [analysisFen, bestMove]);

  // 出现在视口附近时，预取 PGN 并显示“最后一步后的局面”。
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let loaded = false;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e && e.isIntersecting && !loaded) {
          loaded = true;
          loadFen();
        }
      },
      { root: null, rootMargin: "600px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadFen]);

  // 悬停时仅计算“最佳下一步”（不再延迟加载 PGN）
  useEffect(() => {
    if (hovered) {
      computeBestMove();
    } else {
      engineSingleton.stop();
    }
  }, [hovered, computeBestMove]);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ position: "relative", borderRadius: 1, overflow: "hidden" }}
    >
      {/* 保证正方形：容器用 paddingTop: '100%' 建立占位，棋盘绝对定位填充 */}
      <Box ref={wrapRef} sx={{ position: "relative", width: "100%" }}>
        <Box sx={{ paddingTop: "100%" }} />
        <Box sx={{ position: "absolute", inset: 0 }}>
          <Chessboard
            options={{
              position: fen || "start",
              allowDragging: false,
              boardOrientation: "white",
              animationDurationInMs: 150,
              boardStyle: { borderRadius: 8, width: "100%", height: "100%" },
              lightSquareStyle: { backgroundColor: "#edeed1" },
              darkSquareStyle: { backgroundColor: "#7b8794" },
              arrows: arrows.map(([s, e]) => ({ startSquare: s, endSquare: e, color: "#00c8ff99" })),
            }}
          />
        </Box>
      </Box>

      {!bestMove && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            background: hovered ? "linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.12))" : "transparent",
            transition: "background 120ms ease",
          }}
        >
          <Typography variant="caption" color="#fff" sx={{ textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>
            {hovered ? "Computing best move..." : lastMove ? "Last move shown • hover for best move" : "Hover to show best move"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
