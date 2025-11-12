"use client";

import React, { useState } from "react";
import { Box, Card, CardContent, Chip, IconButton, Typography, Button, Divider } from "@mui/material";
import { Icon } from "@iconify/react";
import { GameSummary } from "../types/game";
import { openInAnalyzer, copyPgn, shareGame } from "../api/games-api";
import GameBoardPreview from "./GameBoardPreview";

interface GameCardProps {
  game: GameSummary;
}

/**
 * 游戏卡片组件
 * 显示对局基本信息和操作按钮
 */
export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 处理打开分析器
  const handleOpenInAnalyzer = async () => {
    try {
      setIsLoading(true);
      const url = await openInAnalyzer(game);
      window.location.href = url;
    } catch (error) {
      console.error("Failed to open in analyzer:", error);
      alert("Failed to open game in analyzer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 处理复制 PGN
  const handleCopyPgn = async () => {
    try {
      setIsLoading(true);
      await copyPgn(game);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy PGN:", error);
      alert("Failed to copy PGN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 处理分享
  const handleShare = async () => {
    try {
      setIsLoading(true);
      const shareUrl = await shareGame(game);
      alert(`Share link copied to clipboard!\n${shareUrl}`);
    } catch (error) {
      console.error("Failed to share game:", error);
      alert("Failed to share game. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 获取结果标签颜色和文本
  const getResultInfo = () => {
    switch (game.result) {
      case "1-0":
        return { text: "White Won", color: "success" as const };
      case "0-1":
        return { text: "Black Won", color: "error" as const };
      case "1/2-1/2":
        return { text: "Draw", color: "default" as const };
      default:
        return { text: "Unknown", color: "default" as const };
    }
  };

  const resultInfo = getResultInfo();

  // 格式化玩家显示（包含等级分）
  const formatPlayer = (name: string, elo?: number) => {
    return elo ? `${name} (${elo})` : name;
  };

  // 格式化对局信息
  const formatGameInfo = () => {
    const parts: string[] = [];

    if (game.eco) {
      parts.push(game.eco);
    }
    if (game.opening) {
      parts.push(game.opening);
    }
    if (game.moves > 0) {
      parts.push(`${game.moves} moves`);
    } else {
      parts.push("? moves");
    }

    return parts.join(" • ");
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
      }}
    >
      {/* 棋盘快照 */}
      <GameBoardPreview game={game} />

      <Divider sx={{ my: 1 }} />

      {/* 顶部：玩家信息和结果 */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1}>
            <Typography variant="subtitle2" color="text.secondary" noWrap>
              White
            </Typography>
            <Typography variant="body1" fontWeight="medium" noWrap>
              {formatPlayer(game.white, game.whiteElo)}
            </Typography>
          </Box>

          <Chip
            label={resultInfo.text}
            color={resultInfo.color}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1}>
            <Typography variant="subtitle2" color="text.secondary" noWrap>
              Black
            </Typography>
            <Typography variant="body1" fontWeight="medium" noWrap>
              {formatPlayer(game.black, game.blackElo)}
            </Typography>
          </Box>

          {game.date && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mt: 0.5 }}>
              {game.date}
            </Typography>
          )}
        </Box>
      </Box>

      {/* 中间：对局信息 */}
      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {formatGameInfo()}
        </Typography>

        {/* Hide secondary chips (time control, site URL, round) per design feedback */}
      </CardContent>

      {/* 底部：操作按钮 */}
      <Box sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon icon="mdi:chess" />}
          onClick={handleOpenInAnalyzer}
          disabled={isLoading}
          sx={{ flex: 1 }}
        >
          Open in Analyzer
        </Button>

        <IconButton
          size="small"
          onClick={handleCopyPgn}
          disabled={isLoading}
          title="Copy PGN"
        >
          {copied ? (
            <Icon icon="mdi:check" color="green" />
          ) : (
            <Icon icon="mdi:content-copy" />
          )}
        </IconButton>

        <IconButton
          size="small"
          onClick={handleShare}
          disabled={isLoading}
          title="Share Game"
        >
          <Icon icon="mdi:share" />
        </IconButton>
      </Box>
    </Card>
  );
};

export default GameCard;
