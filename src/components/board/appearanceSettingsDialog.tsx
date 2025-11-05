"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Slider, Stack, Typography } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { boardHueAtom, pieceSetAtom, boardThemeAtom } from './states';
import { PIECE_SETS } from '@/src/constants';

// Probe which piece sets actually exist under /piece/<set>/wK.svg
async function detectPieceSets(): Promise<string[]> {
  const names = Array.from(PIECE_SETS);
  const checks = await Promise.all(names.map(async (name) => {
    try {
      let r = await fetch(`/piece/${name}/wK.svg`, { method: 'HEAD', cache: 'no-cache' });
      if (!r.ok) {
        // Some dev servers may not support HEAD properly; fallback to GET
        r = await fetch(`/piece/${name}/wK.svg`, { method: 'GET', cache: 'no-cache' });
      }
      return r.ok ? name : null;
    } catch { return null; }
  }));
  const found = checks.filter(Boolean) as string[];
  return found.length ? found : ['chicago'];
}

export default function AppearanceSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentSet = useAtomValue(pieceSetAtom);
  const currentHue = useAtomValue(boardHueAtom);
  const currentTheme = useAtomValue(boardThemeAtom);
  const setSet = useSetAtom(pieceSetAtom);
  const setHue = useSetAtom(boardHueAtom);
  const setTheme = useSetAtom(boardThemeAtom);

  const [draftSet, setDraftSet] = useState<string>(currentSet);
  const [draftHue, setDraftHue] = useState<number>(currentHue);
  const [draftTheme, setDraftTheme] = useState<string>(currentTheme);
  const [availableSets, setAvailableSets] = useState<string[]>(['chicago']);

  useEffect(() => { if (open) { setDraftSet(currentSet); setDraftHue(currentHue); setDraftTheme(currentTheme); } }, [open, currentSet, currentHue, currentTheme]);
  useEffect(() => { if (open) { detectPieceSets().then(setAvailableSets).catch(()=>{}); } }, [open]);

  const huePresets = useMemo(() => ([
    { label: 'Classic', hue: 0 },
    { label: 'Green', hue: 120 },
    { label: 'Teal', hue: 160 },
    { label: 'Blue', hue: 200 },
    { label: 'Purple', hue: 260 },
    { label: 'Warm', hue: 25 },
  ]), []);

  const themes = useMemo(() => ([
    { key: 'classic', label: 'Classic' },
    { key: 'wood', label: 'Wood' },
    { key: 'blackGold', label: 'Black / Gold' },
    { key: 'blueGray', label: 'Blue‑Gray' },
  ]), []);

  const apply = () => {
    setSet(draftSet);
    setHue(draftHue);
    setTheme(draftTheme);
    try { localStorage.setItem('appearance', JSON.stringify({ pieceSet: draftSet, boardHue: draftHue, boardTheme: draftTheme })); } catch {}
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Appearance</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Piece Set</Typography>
            <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(112px, 1fr))', gap: 1.2 }}>
              {availableSets.map((s) => (
                <Paper key={s} variant={draftSet===s? 'outlined':'elevation'} sx={{ p: 0.75, borderColor: draftSet===s? 'primary.main': undefined, cursor: 'pointer' }} onClick={()=> setDraftSet(s)}>
                  <Box sx={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 0.5 }}>
                    {['wK','wQ','wP','bK'].map(code => (
                      <Box key={code} component="img" src={`/piece/${s}/${code}.svg`} alt={code} sx={{ width:'100%', height: 34, objectFit:'contain' }} />
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ display:'block', textAlign:'center', mt: 0.5 }}>{s}</Typography>
                </Paper>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Board Colors</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
              {huePresets.map(p => (
                <Button key={p.label} size="small" variant={draftHue===p.hue? 'contained':'outlined'} onClick={()=> setDraftHue(p.hue)}>{p.label}</Button>
              ))}
            </Stack>
            {/* Color pair preview */}
            <Box sx={{ display:'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              {(() => {
                const { getSquareColors } = require('./colors') as any;
                const pair = getSquareColors(draftTheme, draftHue);
                return (
                  <>
                    <Box sx={{ width: 28, height: 18, bgcolor: pair.light, borderRadius: 0.5, border: '1px solid rgba(0,0,0,.2)' }} />
                    <Box sx={{ width: 28, height: 18, bgcolor: pair.dark, borderRadius: 0.5, border: '1px solid rgba(0,0,0,.2)' }} />
                    <Typography variant="caption" color="text.secondary">Preview</Typography>
                  </>
                );
              })()}
            </Box>
            <Slider value={draftHue} onChange={(_,v)=> setDraftHue(v as number)} min={0} max={360} step={1} marks={[0,60,120,180,240,300,360].map(v=>({value:v}))} />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Board Theme</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {themes.map(t => (
                <Button key={t.key} size="small" variant={draftTheme===t.key? 'contained':'outlined'} onClick={()=> setDraftTheme(t.key)}>{t.label}</Button>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={apply}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}
