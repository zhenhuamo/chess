"use client";
import { Box, IconButton, Tooltip, Popover, Stack, Button, Divider, Typography, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel, OutlinedInput, Switch, FormControlLabel, TextField } from "@mui/material";
const Grid: any = Box;
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { gameAtom, currentPositionAtom } from "@/src/sections/analysis/states";
import { SHARE_API_BASE } from "@/src/config/share";
import React from "react";

export default function ShareButton() {
  const game = useAtomValue(gameAtom);
  const position = useAtomValue(currentPositionAtom);
  const disabled = game.history().length === 0;

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const [shareId, setShareId] = React.useState<string | null>(null);
  const [includePly, setIncludePly] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [autoPlay, setAutoPlay] = React.useState(false);
  const [speed, setSpeed] = React.useState(800);
  const [width, setWidth] = React.useState(420);
  const [height, setHeight] = React.useState(480);

  const onShare = async (e?: any) => {
    if (e?.currentTarget) setAnchorEl(e.currentTarget as HTMLElement);
    try {
      const pgn = game.pgn();
      const resp = await fetch(`${SHARE_API_BASE}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pgn, meta: { source: 'analyze', moves: game.history().length } }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('Share failed', resp.status, text);
        setSnack({ open: true, msg: 'Share failed, please try again later' });
        return;
      }
      const data = await resp.json();
      const id = (data as any)?.id as string;
      setShareId(id);
      setOpen(true);
      try {
        const url = buildLink(id);
        await navigator.clipboard?.writeText?.(url);
        setSnack({ open: true, msg: 'Share link copied' });
      } catch { }
    } catch (e) {
      console.error('Share exception', e);
      setSnack({ open: true, msg: 'Share failed, please try again later' });
    }
  };

  const currentPly = Math.max(0, Number(position?.currentMoveIdx || 0));
  const buildLink = (id: string) => {
    const base = `${location.origin}/g/${id}`;
    return includePly ? `${base}?ply=${currentPly}` : base;
  };
  const buildEmbed = (id: string) => {
    const src = `${location.origin}/embed/${id}?theme=${theme}&auto=${autoPlay ? 1 : 0}&speed=${speed}`;
    return `<iframe src="${src}" width="${width}" height="${height}" frameborder="0"></iframe>`;
  };
  const copy = async (text: string, msg = 'Copied') => {
    try { await navigator.clipboard?.writeText?.(text); setSnack({ open: true, msg }); } catch { }
  };
  const nativeShare = async (id: string) => {
    try {
      if ((navigator as any).share) {
        const url = buildLink(id);
        await (navigator as any).share({ title: 'Shared Chess Game', text: 'Check out this game', url });
      } else {
        await copy(buildLink(id));
      }
    } catch { }
  };

  return (
    <>
      <Tooltip title="Share as Short Link">
        <Grid>
          <IconButton disabled={disabled} onClick={onShare} sx={{ paddingX: 1.2, paddingY: 0.5 }}>
            <Icon icon="ri:share-forward-line" />
          </IconButton>
        </Grid>
      </Tooltip>

      <Popover open={open} anchorEl={anchorEl} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Box sx={{ p: 1.5, maxWidth: 440 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Share</Typography>
            <Divider />
            {shareId ? (
              <>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControlLabel control={<Switch checked={includePly} onChange={(e) => setIncludePly(e.target.checked)} />} label="Include current step" />
                  <Button size="small" onClick={() => copy(buildLink(shareId), 'Link copied')}>Copy Link</Button>
                  <Button size="small" onClick={() => copy(game.pgn(), 'PGN copied')}>Copy PGN</Button>
                  <Button size="small" onClick={() => window.open(buildLink(shareId), '_blank')}>Open</Button>
                </Stack>
                <Divider />
                <Typography variant="subtitle2">Embed</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel id="theme">Theme</InputLabel>
                    <Select labelId="theme" input={<OutlinedInput label="Theme" />} value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                      <MenuItem value="light">light</MenuItem>
                      <MenuItem value="dark">dark</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel control={<Switch checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />} label="Auto" />
                  <TextField size="small" label="Speed" type="number" value={speed} onChange={(e) => setSpeed(Math.max(200, Math.min(5000, Number(e.target.value) || 800)))} sx={{ width: 110 }} />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField size="small" label="Width" type="number" value={width} onChange={(e) => setWidth(Math.max(200, Number(e.target.value) || 420))} sx={{ width: 120 }} />
                  <TextField size="small" label="Height" type="number" value={height} onChange={(e) => setHeight(Math.max(200, Number(e.target.value) || 480))} sx={{ width: 120 }} />
                  <Button size="small" onClick={() => copy(buildEmbed(shareId), 'Embed code copied')}>Copy Embed</Button>
                </Stack>
                <Divider />
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small" onClick={() => nativeShare(shareId)}>System Share</Button>
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">Preparing share link…</Typography>
            )}
          </Stack>
        </Box>
      </Popover>

      <Snackbar open={snack.open} autoHideDuration={2200} onClose={() => setSnack({ open: false, msg: '' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
}
