"use client";
import { useState } from "react";
import { Button } from "@mui/material";
import GameSettingsDialog from "./GameSettingsDialog";

export default function GameSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" onClick={()=> setOpen(true)}>Game Settings</Button>
      <GameSettingsDialog open={open} onClose={()=> setOpen(false)} />
    </>
  );
}

