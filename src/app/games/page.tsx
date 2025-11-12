"use client";

import React from "react";
import { Box, Typography, Container, Grid, Alert, AlertTitle, Pagination, FormControl, InputLabel, Select, MenuItem, Button, Paper, Stack } from "@mui/material";
import { Icon } from "@iconify/react";
import { useGamesState } from "./hooks/useGamesState";
import GameCard from "./components/GameCard";
import ProgressIndicator from "./components/ProgressIndicator";
import GameCardSkeleton from "./components/GameCardSkeleton";
import GamesFilter from "./components/GamesFilter";

// Note: Metadata is not used in client components.
// For SEO in Next.js App Router, move metadata to a separate layout.tsx or use server components.

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Chess Games Library",
  description: "Free chess games database with Stockfish analysis",
  url: "https://chess-analysis.org/games",
  applicationCategory: "GameApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Browse 100,000+ chess games",
    "Stockfish 17 analysis",
    "Opening explorer with ECO codes",
    "Filter by rating and result",
    "PGN export and sharing",
  ],
};

export default function GamesPage() {
  const {
    games,
    isParsing,
    progress,
    error,
    currentFile,
    startParsing,
    stopParsing,
    reset,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalGames,
    totalPages,
  } = useGamesState();

  const workerRef = React.useRef<Worker | null>(null);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  // 组件挂载时初始化 Worker 并开始解析
  React.useEffect(() => {
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

  // 当切换文件时，停止当前解析并重新开始
  const prevFileRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!workerRef.current) return;

    // 跳过首轮（由首次挂载的 effect 启动解析）
    if (prevFileRef.current === null) {
      prevFileRef.current = currentFile;
      return;
    }

    if (prevFileRef.current !== currentFile) {
      // 停止并重置，再重新解析新文件
      stopParsing(workerRef.current);
      reset();
      startParsing(workerRef.current);
      prevFileRef.current = currentFile;
    }
  }, [currentFile, startParsing, stopParsing, reset]);

  // 计算进度信息
  const progressInfo = React.useMemo(() => {
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
  const showSkeleton = isInitialLoad && totalGames === 0;

  // 当游戏加载时，隐藏骨架屏
  React.useEffect(() => {
    if (totalGames > 0) {
      setIsInitialLoad(false);
    }
  }, [totalGames]);

  // 当过滤器或文件变化时，回到第一页
  React.useEffect(() => {
    setPage(1);
  }, [currentFile, setPage]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Main Content - Games Grid and Filters FIRST */}
      {/* This is what users see immediately when they land on the page */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 3 }}>
          {/* Filters Sidebar */}
          <GamesFilter />
        </Grid>

        <Grid size={{ xs: 12, lg: 9 }}>
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

          {/* 对局网格（固定区域） */}
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

            {totalGames === 0 && !isParsing && !error && (
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
                    Try reloading the page or check your network connection.
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

          {/* 底部控制：统计 + 页容量 + 分页器 */}
          <Box mt={3} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              🎯 {totalGames} games loaded
            </Typography>

            <Box display="flex" alignItems="center" gap={2}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="page-size-label">Page size</InputLabel>
                <Select
                  labelId="page-size-label"
                  id="page-size-select"
                  value={String(pageSize)}
                  label="Page size"
                  onChange={(e) => setPageSize(parseInt(String(e.target.value), 10))}
                >
                  {[12, 24, 36, 48].map((n) => (
                    <MenuItem key={n} value={String(n)}>
                      {n} / page
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Pagination
                color="primary"
                count={Math.max(totalPages, 1)}
                page={Math.min(page, Math.max(totalPages, 1))}
                onChange={(_, value) => setPage(value)}
                showFirstButton
                showLastButton
              />
            </Box>
          </Box>

          {/* 加载更多（v2 将支持无限滚动） */}
          {isParsing && totalGames > 0 && (
            <Box mt={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Loading more games...
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Landing Page Content - Below the Fold */}
      {/* This content is for SEO and to educate users who scroll down */}

      {/* Hero Section - SEO Optimized Landing */}
      <Box
        sx={{
          textAlign: "center",
          py: 8,
          mb: 6,
          background: "linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(25,118,210,0.02) 100%)",
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider"
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
          Master Chess Games Library | Free Chess Analysis
        </Typography>
        <Typography variant="h6" component="p" color="text.secondary" sx={{ maxWidth: 800, mx: "auto", mb: 4 }}>
          Browse and analyze over 100,000 high-quality chess games from Lichess.org. Study master-level play, explore openings, and improve your chess skills with our powerful free chess analysis tools featuring Stockfish 17 engine.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minWidth: 150,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Typography variant="h4" component="div" color="primary" fontWeight="bold">100K+</Typography>
            <Typography variant="body2" color="text.secondary">Master Games for Analysis</Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minWidth: 150,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Typography variant="h4" component="div" color="primary" fontWeight="bold">2000-4000+</Typography>
            <Typography variant="body2" color="text.secondary">Elo Range</Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minWidth: 150,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Typography variant="h4" component="div" color="primary" fontWeight="bold">Instant</Typography>
            <Typography variant="body2" color="text.secondary">Analysis Chess Board</Typography>
          </Paper>
        </Stack>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: "auto", mb: 2 }}>
          Learn from grandmaster-level games, study opening theory, and analyze critical positions with Stockfish 17 - the world's strongest chess engine, now running in your browser for free chess game analysis.
        </Typography>
      </Box>

      {/* Value Proposition Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom textAlign="center" sx={{ mb: 4 }}>
          Why Use Our Free Chess Analysis Games Library?
        </Typography>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={2} sx={{ p: 4, height: "100%", textAlign: "center" }}>
              <Icon icon="mdi:brain" width={48} height={48} color="#1976d2" style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>Learn Chess Analysis from Masters</Typography>
              <Typography variant="body2" color="text.secondary">
                Study games from players rated 2000-4000+ Elo for free chess game analysis. Analyze grandmaster strategies, opening choices, and endgame techniques to elevate your chess analysis understanding.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={2} sx={{ p: 4, height: "100%", textAlign: "center" }}>
              <Icon icon="mdi:robot" width={48} height={48} color="#1976d2" style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>AI-Powered Chess Engine Analysis</Typography>
              <Typography variant="body2" color="text.secondary">
                One-click chess board analysis with Stockfish 17, the world's strongest chess engine. Get instant evaluation and detailed free chess analysis for any position in your browser.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={2} sx={{ p: 4, height: "100%", textAlign: "center" }}>
              <Icon icon="mdi:database-search" width={48} height={48} color="#1976d2" style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>Smart Lichess Analysis Style Filtering</Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by result, Elo rating, date range, and opening (ECO code). Find exactly the games you want to study in seconds, just like Lichess analysis or Chess.com analysis features.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Features Grid */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom textAlign="center" sx={{ mb: 4 }}>
          Powerful Chess Analysis Features
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
              <Icon icon="mdi:lightning-bolt" width={32} height={32} color="#1976d2" style={{ marginRight: 16, marginTop: 4 }} />
              <Box>
                <Typography variant="h6" gutterBottom>Lightning Fast Analysis Chess</Typography>
                <Typography variant="body2" color="text.secondary">
                  Stream and parse thousands of games in seconds with our optimized chess analysis tools. No waiting - start your free analysis chess immediately on our analysis chess board.
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
              <Icon icon="mdi:share-variant" width={32} height={32} color="#1976d2" style={{ marginRight: 16, marginTop: 4 }} />
              <Box>
                <Typography variant="h6" gutterBottom>Easy Sharing Analysis Results</Typography>
                <Typography variant="body2" color="text.secondary">
                  Share interesting games with friends or students for collaborative chess analysis. Generate shareable links or copy PGN notation with one click for free analysis chess sessions.
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
              <Icon icon="mdi:chess-pawn" width={32} height={32} color="#1976d2" style={{ marginRight: 16, marginTop: 4 }} />
              <Box>
                <Typography variant="h6" gutterBottom>Opening Explorer Analysis</Typography>
                <Typography variant="body2" color="text.secondary">
                  Study opening theory with ECO code classification for complete chess game analysis. See how masters handle your favorite openings at the highest level with our chess analysis board tools.
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
              <Icon icon="mdi:download" width={32} height={32} color="#1976d2" style={{ marginRight: 16, marginTop: 4 }} />
              <Box>
                <Typography variant="h6" gutterBottom>Export PGN for Offline Analysis</Typography>
                <Typography variant="body2" color="text.secondary">
                  Download any game as PGN notation. Import into your favorite chess software or save for offline chess engine analysis and further study.
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom textAlign="center" sx={{ mb: 4 }}>
          Chess Analysis Frequently Asked Questions
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={1} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>What is the Games Library for chess analysis?</Typography>
              <Typography variant="body2" color="text.secondary">
                The Games Library is a comprehensive free chess analysis database with over 100,000 high-quality chess games from Lichess.org. It allows you to browse, filter, and analyze master-level games using Stockfish 17 engine for instant chess game analysis directly in your browser - similar to Lichess analysis or Chess.com analysis features.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={1} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>How do I analyze chess games on your free analysis chess board?</Typography>
              <Typography variant="body2" color="text.secondary">
                Simply click "Open in Analyzer" on any game card. The game will be loaded into our analysis chess board with Stockfish 17 running in the background, providing real-time chess engine analysis, evaluation, and best move suggestions for complete analysis chess free experience.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={1} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>What level of games are available for chess analysis free?</Typography>
              <Typography variant="body2" color="text.secondary">
                We include games with Elo ratings from 2000 to 4000+ for high-quality chess analysis. Our databases feature three tiers: 2000+, 2025-08-2000+, and the highest quality 4000+ games for the most instructive chess game analysis content on our free chess analysis platform.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={1} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>Can I filter games by opening for targeted chess analysis?</Typography>
              <Typography variant="body2" color="text.secondary">
                Yes! You can filter games by ECO code (e.g., C20, B12) and opening name for focused chess analysis. This makes it easy to study specific openings and see how masters handle different variations, just like premium Lichess analysis or Chess.com analysis features.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={1} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>How do I share my chess analysis results with others?</Typography>
              <Typography variant="body2" color="text.secondary">
                Click the share button on any game card to generate a unique link to your chess analysis board. You can also copy the PGN notation to your clipboard for use in other chess software or to share your free chess analysis results with students and friends.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={1} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>Is your chess analysis board completely free to use?</Typography>
              <Typography variant="body2" color="text.secondary">
                Yes! The Games Library offers completely free chess analysis. All games are from Lichess.org's public database, and our analysis chess tools are powered by the open-source Stockfish engine, providing premium-quality chess analysis free for everyone.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Final CTA - At the very bottom */}
      <Box sx={{ mt: 10, py: 6, textAlign: "center", backgroundColor: "rgba(25,118,210,0.05)", borderRadius: 4 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Ready to Improve Your Chess?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 4 }}>
          Join thousands of chess players who are learning from master games. Start exploring our library now and take your chess skills to the next level.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<Icon icon="mdi:chess" />}
          onClick={() => {
            // Scroll to the top of the page (where games are)
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          sx={{ px: 4, py: 1.5 }}
        >
          Start Browsing Games
        </Button>
      </Box>
    </Container>
  )
}
