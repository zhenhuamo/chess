'use client';

import { useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { Button } from '@mui/material';
import HomeAnalysisSettingsDialog, { HomeAnalysisSettings } from './HomeAnalysisSettingsDialog';

interface Props {
  settings: HomeAnalysisSettings;
  onChange: (next: HomeAnalysisSettings) => void;
}

export default function HomeAnalysisSettingsButton({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<SettingsIcon fontSize="small" />}
        onClick={() => setOpen(true)}
      >
        Analysis settings
      </Button>
      <HomeAnalysisSettingsDialog
        open={open}
        value={settings}
        onClose={() => setOpen(false)}
        onApply={onChange}
      />
    </>
  );
}

