"use client";

import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Paper,
  Typography,
  Divider,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useGamesState } from "../hooks/useGamesState";

/**
 * 游戏过滤器组件
 * v1: 文件选择、结果过滤
 * v2: 将添加日期、ELO、ECO 等高级过滤器
 */
export const GamesFilter: React.FC = () => {
  const { currentFile, setCurrentFile, filter, setFilter, reset } = useGamesState();

  // 可用文件列表
  const availableFiles = [
    { value: "lichess-4000.pgn", label: "Lichess 4000+ (50k games)" },
    { value: "lichess-2025-08-2000.pgn", label: "Lichess 2000+ (10k games)" },
    { value: "lichess-2000.pgn", label: "Lichess 2000+ (50k games)" },
  ];

  // 处理文件选择
  const handleFileChange = (event: SelectChangeEvent<string>) => {
    const newFile = event.target.value;
    setCurrentFile(newFile);
    // 自动重置并重新解析
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // 处理结果过滤
  const handleResultFilterChange = (event: SelectChangeEvent<string>) => {
    const newResult = event.target.value as "all" | "white" | "draw" | "black";
    setFilter({
      ...filter,
      result: newResult,
    });
  };

  // 获取当前文件名显示
  const getCurrentFileLabel = () => {
    const file = availableFiles.find((f) => f.value === currentFile);
    return file?.label || currentFile;
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: "fit-content",
        position: "sticky",
        top: 20,
      }}
    >
      {/* 标题 */}
      <Box display="flex" alignItems="center" mb={3}>
        <Icon icon="mdi:filter" width={24} height={24} style={{ marginRight: 8 }} />
        <Typography variant="h6">Filters</Typography>
      </Box>

      {/* 文件选择 */}
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel id="file-select-label">PGN File</InputLabel>
        <Select
          labelId="file-select-label"
          id="file-select"
          value={currentFile}
          label="PGN File"
          onChange={handleFileChange}
        >
          {availableFiles.map((file) => (
            <MenuItem key={file.value} value={file.value}>
              {file.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <small>{getCurrentFileLabel()}</small>
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* 结果过滤 */}
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel id="result-filter-label">Result</InputLabel>
        <Select
          labelId="result-filter-label"
          id="result-filter"
          value={filter.result}
          label="Result"
          onChange={handleResultFilterChange}
        >
          <MenuItem value="all">
            <Box display="flex" alignItems="center">
              <Icon icon="mdi:select-all" width={16} height={16} style={{ marginRight: 8 }} />
              All Results
            </Box>
          </MenuItem>
          <MenuItem value="white">
            <Box display="flex" alignItems="center">
              <Icon icon="mdi:chess-king" width={16} height={16} style={{ marginRight: 8 }} />
              White Wins
            </Box>
          </MenuItem>
          <MenuItem value="black">
            <Box display="flex" alignItems="center">
              <Box sx={{ filter: "invert(1)", mr: 1 }}>
                <Icon icon="mdi:chess-king" width={16} height={16} />
              </Box>
              Black Wins
            </Box>
          </MenuItem>
          <MenuItem value="draw">
            <Box display="flex" alignItems="center">
              <Icon icon="mdi:scale-balanced" width={16} height={16} style={{ marginRight: 8 }} />
              Draws
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* 快速统计 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Quick Stats
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <small>
            File contains thousands of chess games from lichess.org. Select a file and apply filters to browse games.
          </small>
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 重置按钮 */}
      <Box>
        <Typography
          variant="body2"
          color="primary"
          sx={{
            cursor: "pointer",
            textDecoration: "underline",
            mt: 2,
            display: "flex",
            alignItems: "center",
          }}
          onClick={reset}
        >
          <Icon icon="mdi:refresh" width={16} height={16} style={{ marginRight: 4 }} />
          Reset All Filters
        </Typography>
      </Box>
    </Paper>
  );
};

export default GamesFilter;
