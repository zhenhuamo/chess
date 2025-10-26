"use client";
export const dynamic = "force-dynamic";
import EnginePlayBoard from "../components/EnginePlayBoard";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { Suspense } from "react";
import GameSettingsButton from "./GameSettingsButton";
import GameSettingsDialog from "./GameSettingsDialog";
import GameInProgress from "./GameInProgress";
import GameRecap from "./GameRecap";
import { PlayProvider, usePlayState } from "./PlayState";

function PlayContent() {
  const { isGameInProgress, config } = usePlayState();
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 780 }}>
        <Typography variant="h5" sx={{ mb: 1, color: 'text.primary' }}>Chesskit Play vs Stockfish</Typography>
        <EnginePlayBoard config={config} />
      </Box>
      {/* The right auxiliary panel has been integrated into the EnginePlayBoard sidebar for a unified look */}
    </Box>
  );
}

export default function PlayPage() {
  return (
    <Box sx={{ minHeight: '100vh', p: 2, bgcolor: 'background.default' }}>
      <PlayProvider>
        {/** Wrap client hooks (useSearchParams in useGameDatabase) in Suspense to satisfy App Router */}
        <Suspense fallback={<div />}> 
          <PlayContent />
        </Suspense>
      </PlayProvider>
    </Box>
  );
}
