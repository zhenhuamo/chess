"use client";

import React from "react";
import { Card, CardContent, Box, Skeleton } from "@mui/material";

/**
 * 游戏卡片骨架屏
 * 加载时显示的占位符
 */
export const GameCardSkeleton: React.FC = () => {
  return (
    <Card
      sx={{
        height: "100%",
      }}
    >
      {/* 顶部：玩家信息 */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="80%" height={24} />
          </Box>
          <Skeleton variant="rounded" width={60} height={24} />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="80%" height={24} />
          </Box>
          <Skeleton variant="text" width={80} height={20} />
        </Box>
      </Box>

      {/* 中间：对局信息 */}
      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
        <Box display="flex" justifyContent="space-between">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="30%" height={16} />
        </Box>
      </CardContent>

      {/* 底部：操作按钮 */}
      <Box sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
        <Skeleton variant="rounded" width="100%" height={36} />
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="circular" width={36} height={36} />
      </Box>
    </Card>
  );
};

/**
 * 骨架屏网格
 * 用于显示多个加载占位符
 */
export const GameCardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 9 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index}>
          <GameCardSkeleton />
        </Box>
      ))}
    </>
  );
};

export default GameCardSkeleton;
