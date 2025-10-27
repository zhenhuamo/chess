"use client";
import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Slider, Stack, Switch, TextField, Typography } from "@mui/material";
import { PlayProvider, usePlayState, EngineVariant } from "./PlayState";

interface Props { open: boolean; onClose: () => void }

export default function GameSettingsDialog({ open, onClose }: Props) {
  const { config, setConfig, startGame } = usePlayState();
  const [local, setLocal] = useState(config);
  const set = <K extends keyof typeof local>(k: K, v: (typeof local)[K]) => setLocal(prev => ({ ...prev, [k]: v }));

  const variantLabel = (v: EngineVariant) => {
    switch (v) {
      case 'sf17': return 'Stockfish 17 (75MB)';
      case 'sf17-lite': return 'Stockfish 17 Lite';
      case 'sf17-single': return 'Stockfish 17 (single)';
      case 'sf161': return 'Stockfish 16.1';
      case 'sf161-lite': return 'Stockfish 16.1 Lite';
      case 'sf161-single': return 'Stockfish 16.1 (single)';
      case 'sf16-nnue': return 'Stockfish 16 NNUE';
      case 'sf16-nnue-single': return 'Stockfish 16 NNUE (single)';
      case 'sf11': return 'Stockfish 11 (ASM/HCE)';
    }
  };

  const sabSupported = (()=>{ try { return typeof SharedArrayBuffer !== 'undefined'; } catch { return false; } })();
  const wasmSupported = (()=>{ try { return typeof WebAssembly === 'object'; } catch { return false; } })();
  const isVariantSupported = (v: EngineVariant) => {
    if (!wasmSupported) return v === 'sf11';
    return true; // wasm ok, we fallback to single-thread if SAB missing
  };

  const onStart = () => {
    // Clamp threads when SAB not available
    const adjusted = { ...local, threads: sabSupported ? local.threads : 1 };
    setConfig(adjusted);
    startGame();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ my: 1 }} variant="h5">Set game parameters</DialogTitle>
      <DialogContent sx={{ pb: 0 }}>
        <Typography color="text.secondary">
          Stockfish 17 Lite is the default engine if your device supports its requirements. It offers the best balance between speed and strength. Stockfish 17 is the strongest engine available, note that it requires a one time download of 75MB.
        </Typography>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <Stack alignItems="center">
            <FormControl>
              <InputLabel id="engine-label">Bot's engine</InputLabel>
              <Select labelId="engine-label" input={<OutlinedInput label="Engine" />} value={local.variant} onChange={(e)=> set('variant', e.target.value as EngineVariant)} sx={{ width: 320, maxWidth: '100%' }}>
                {(['sf17','sf17-lite','sf17-single','sf161','sf161-lite','sf161-single','sf16-nnue','sf16-nnue-single','sf11'] as EngineVariant[]).map(v => (
                  <MenuItem key={v} value={v} disabled={!isVariantSupported(v)}>
                    {variantLabel(v)}{!isVariantSupported(v) ? ' (not supported)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography gutterBottom>Bot Elo rating: {local.elo}</Typography>
            <Slider min={1320} max={3190} step={10} value={local.elo} onChange={(_, v)=> set('elo', v as number)} marks={[1320,1694,2068,2442,2816,3190].map(v=>({value:v}))} />
          </Box>

          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={local.youPlay==='b'} onChange={(e)=> set('youPlay', e.target.checked?'b':'w')} />
              <Typography>You play as Black</Typography>
            </Stack>
            <TextField label="Threads" size="small" type="number" value={local.threads} onChange={(e)=> set('threads', Math.max(1, Math.min(32, Number(e.target.value))))} sx={{ width: 140 }} disabled={!sabSupported} helperText={!sabSupported ? 'Single-thread fallback on this browser' : ''} />
          </Stack>

          <TextField label="Optional starting position (FEN or PGN)" placeholder="FEN or PGN" value={local.starting ?? ''} onChange={(e)=> set('starting', e.target.value)} fullWidth multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ m: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onStart}>Start Game</Button>
      </DialogActions>
    </Dialog>
  );
}
