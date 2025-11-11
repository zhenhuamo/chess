"use client";

import React from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import { ParseProgress } from "../types/game";

interface ProgressIndicatorProps {
  progress: ParseProgress | null;
  isParsing: boolean;
}

/**
 * 加载进度指示器
 * 显示 PGN 解析进度条和状态信息
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  isParsing,
}) => {
  if (!isParsing || !progress) return null;

  // 计算百分比
  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : progress.current > 0
    ? Math.min((progress.current / 1000) * 100, 90) // 如果没有总数，按已解析的对局数估算
    : 0;

  // 格式化显示文本
  const formatProgressText = () => {
    if (progress.done) {
      return `✅ Parsing complete! ${progress.current} games loaded`;
    }
    return `⏳ Parsing games... ${progress.current}${progress.total ? ` / ~${progress.total}` : ""}`;
  };

  // 预计剩余时间（非常粗略的估计）
  const formatEta = () => {
    if (!progress.total || progress.done) return "";
    const remaining = progress.total - progress.current;
    const seconds = Math.round(remaining * 0.01); // 假设每局需要 0.01 秒
    if (seconds < 60) return `${seconds}s remaining`;
    return `${Math.round(seconds / 60)}m ${seconds % 60}s remaining`;
  };

  return (
    <Box
      mb={3}
      p={2}
      border={1}
      borderColor="divider"
      borderRadius={2}
      sx={{
        backgroundColor: "rgba(0, 0, 0, 0.02)",
      }}
    >
      {/* 进度文本 */}
      <Typography variant="body2" gutterBottom fontWeight="medium">
        {formatProgressText()}
      </Typography>

      {/* 进度条 */}
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 10,
          borderRadius: 5,
          mb: 1,
        }}
      />

      {/* 百分比和 ETA */}
      <Box display="flex" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          {percentage}%
        </Typography>
        {!progress.done && progress.total && (
          <Typography variant="caption" color="text.secondary">
            {formatEta()}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ProgressIndicator;
