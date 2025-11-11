"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Container, Grid, Alert, AlertTitle } from "@mui/material";
import { Icon } from "@iconify/react";
import { useGamesState } from "./hooks/useGamesState";
import GameCard from "./components/GameCard";
import GamesFilter from "./components/GamesFilter";
import ProgressIndicator from "./components/ProgressIndicator";
import GameCardSkeleton from "./components/GameCardSkeleton";

export default function GamesPage() {
  const {
    games,
    isParsing,
    progress,
    error,
    currentFile,
    startParsing,
  } = useGamesState();

  const workerRef = useRef<Worker | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 组件挂载时初始化 Worker 并开始解析
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 创建 Worker
    workerRef.current = new Worker(
      new URL("./workers/parse-games.worker.ts", import.meta.url)
    );

    // 开始解析
    startParsing(workerRef.current);

    // 清理函数
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [startParsing]);

  // 计算进度信息
  const progressInfo = useMemo(() => {
    if (!progress) return null;

    const percentage = progress.total
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

    return {
      ...progress,
      percentage,
    };
  }, [progress]);

  // 计算是否显示骨架屏
  const showSkeleton = isInitialLoad && games.length === 0;

  // 当游戏加载时，隐藏骨架屏
  useEffect(() => {
    if (games.length > 0) {
      setIsInitialLoad(false);
    }
  }, [games]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Games Library
        </Typography>
        <Typography variant="body1" color="text.secondary" component="div">
          <Icon
            icon="mdi:chess"
            style={{ verticalAlign: "middle", marginRight: 8, marginLeft: 4 }}
          />
          Browse thousands of chess games from{" "}
          <Typography
            component="a"
            href="https://lichess.org"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
          >
            lichess.org
          </Typography>
          . Click on any game to analyze it with Stockfish.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* 侧边栏过滤器 */}
        <Grid size={{ xs: 12, md: 3 }}>
          <GamesFilter />
        </Grid>

        {/* 主内容区 */}
        <Grid size={{ xs: 12, md: 9 }}>
          {/* 当前文件信息 */}
          <Box
            mb={2}
            p={2}
            borderRadius={1}
            sx={{ backgroundColor: "rgba(0, 0, 0, 0.03)" }}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              📁 Current file: <strong>{currentFile}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🎯 {games.length} games loaded
            </Typography>
          </Box>

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Loading Error</AlertTitle>
              {error}
            </Alert>
          )}

          {/* 解析状态和进度 */}
          {(isParsing || showSkeleton) && (
            <Box mb={3}>
              {showSkeleton && (
                <Box mb={3}>
                  <Typography variant="body2" gutterBottom>
                    Initializing and loading games...
                  </Typography>
                  <Grid container spacing={3}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                        <GameCardSkeleton />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              {isParsing && progress && (
                <ProgressIndicator progress={progress} isParsing={isParsing} />
              )}
            </Box>
          )}

          {/* 对局网格 */}
          <Grid container spacing={3}>
            {showSkeleton && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                    <GameCardSkeleton />
                  </Grid>
                ))}
              </>
            )}

            {games.length === 0 && !isParsing && !error && (
              <Grid size={{ xs: 12 }}>
                <Box
                  p={6}
                  textAlign="center"
                  border={2}
                  borderColor="divider"
                  borderRadius={2}
                  sx={{ borderStyle: "dashed" }}
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No games found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try selecting a different PGN file or adjusting your filters.
                  </Typography>
                </Box>
              </Grid>
            )}

            {games.map((game) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={game.id}>
                <GameCard game={game} />
              </Grid>
            ))}
          </Grid>

          {/* 加载更多（v2 将支持无限滚动） */}
          {isParsing && games.length > 0 && (
            <Box mt={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Loading more games...
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
