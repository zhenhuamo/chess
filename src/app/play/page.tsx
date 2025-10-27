"use client";
export const dynamic = "force-dynamic";
import EnginePlayBoard from "../components/EnginePlayBoard";
import { Box, Paper } from "@mui/material";
import { Suspense } from "react";
import GameSettingsButton from "./GameSettingsButton";
import GameSettingsDialog from "./GameSettingsDialog";
import GameInProgress from "./GameInProgress";
import GameRecap from "./GameRecap";
import { PlayProvider, usePlayState } from "./PlayState";

function PlayContent() {
  const { config } = usePlayState();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', p: { xs: 1, md: 2 }, boxSizing: 'border-box' }}>
      {/* Unified card containing board + right panel; fills the first screen */}
      <Paper variant="outlined" sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.paper',
        borderColor: 'divider',
        borderWidth: 1.5,
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        borderRadius: 2,
        p: { xs: 1, md: 2 },
      }}>
        <EnginePlayBoard config={config} embedInCard />
      </Paper>
    </Box>
  );
}

export default function PlayPage() {
  return (
    <Box sx={{ height: '100vh', p: 0, bgcolor: 'background.default' }}>
      <PlayProvider>
        <Suspense fallback={<div />}> 
          <PlayContent />
        </Suspense>
      </PlayProvider>
    </Box>
  );
}
