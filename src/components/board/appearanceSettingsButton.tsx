"use client";
import { Box, IconButton, Tooltip } from "@mui/material";
const Grid: any = Box;
import { Icon } from "@iconify/react";
import { useState } from "react";
import AppearanceSettingsDialog from "./appearanceSettingsDialog";

export default function AppearanceSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title="Board & pieces">
        <Grid>
          <IconButton onClick={() => setOpen(true)} sx={{ paddingX: 1.2, paddingY: 0.5 }}>
            <Icon icon="ri:palette-line" />
          </IconButton>
        </Grid>
      </Tooltip>
      <AppearanceSettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

