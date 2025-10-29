'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ENGINE_VARIANTS, EngineVariant, describeEngineVariant } from '@/src/types/engine';

export interface HomeAnalysisSettings {
  variant: EngineVariant;
  depth: number;
  multiPv: number;
  threads: number;
  elo: number;
}

interface Props {
  open: boolean;
  value: HomeAnalysisSettings;
  onClose: () => void;
  onApply: (next: HomeAnalysisSettings) => void;
}

const MIN_DEPTH = 6;
const MAX_DEPTH = 30;
const MIN_THREADS = 1;
const MAX_THREADS = 16;
const MIN_ELO = 1320;
const MAX_ELO = 3190;

export default function HomeAnalysisSettingsDialog({ open, value, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<HomeAnalysisSettings>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const set = <K extends keyof HomeAnalysisSettings>(key: K, next: HomeAnalysisSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: next }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Analysis settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel id="home-engine-variant">Engine</InputLabel>
            <Select
              labelId="home-engine-variant"
              input={<OutlinedInput label="Engine" />}
              value={draft.variant}
              onChange={(event) => set('variant', event.target.value as EngineVariant)}
            >
              {ENGINE_VARIANTS.map((variant) => (
                <MenuItem key={variant} value={variant}>
                  {describeEngineVariant(variant)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography gutterBottom>Search depth: {draft.depth}</Typography>
            <Slider
              value={draft.depth}
              onChange={(_, next) => set('depth', next as number)}
              min={MIN_DEPTH}
              max={MAX_DEPTH}
              step={1}
              marks={[MIN_DEPTH, 12, 18, 24, MAX_DEPTH].map((v) => ({ value: v }))}
            />
          </Box>

          <Box>
            <Typography gutterBottom>Engine strength (Elo): {draft.elo}</Typography>
            <Slider
              value={draft.elo}
              onChange={(_, next) => set('elo', next as number)}
              min={MIN_ELO}
              max={MAX_ELO}
              step={10}
              marks={[MIN_ELO, 1694, 2068, 2442, 2816, MAX_ELO].map((v) => ({ value: v }))}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              label="Threads"
              type="number"
              value={draft.threads}
              onChange={(event) => {
                const next = Number(event.target.value);
                set('threads', Math.max(MIN_THREADS, Math.min(MAX_THREADS, next || MIN_THREADS)));
              }}
              InputProps={{ inputProps: { min: MIN_THREADS, max: MAX_THREADS } }}
              sx={{ width: { xs: '100%', sm: 160 } }}
              helperText="Used when Stockfish multi-threading is available"
            />
            <Box sx={{ flex: 1 }}>
              <Typography gutterBottom>Multi-PV lines: {draft.multiPv}</Typography>
              <Slider
                value={draft.multiPv}
                onChange={(_, next) => set('multiPv', next as number)}
                min={1}
                max={6}
                step={1}
                marks
              />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleApply}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}

