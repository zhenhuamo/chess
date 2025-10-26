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
      <Box sx={{ flex: 1, minWidth: 720 }}>
        <Typography variant="h5" sx={{ mb: 1, color: 'text.primary' }}>Chesskit Play vs Stockfish</Typography>
        <EnginePlayBoard config={config} />
      </Box>
      <Box sx={{ width: { xs: '100%', md: 420 }, display: 'flex', justifyContent: 'center' }}>
        {/* Make the side panel blend with the app theme (same as analysis right panel) */}
        <Paper variant="outlined" sx={{ mt: { xs: 0, md: '2.5em' }, p: 3, maxWidth: 400, width: '100%', backgroundColor: 'background.paper', borderColor: 'divider', borderWidth: 1.5, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
          <Stack spacing={3} alignItems="center">
            <GameInProgress />
            {!isGameInProgress && <GameSettingsButton />}
            <GameRecap />
          </Stack>
        </Paper>
      </Box>
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
