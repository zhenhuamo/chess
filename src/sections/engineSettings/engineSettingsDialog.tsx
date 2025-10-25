"use client";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, FormControl, InputLabel, OutlinedInput, Select, MenuItem, Typography, Slider } from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import { engineDepthAtom, engineMultiPvAtom, engineNameAtom, engineWorkersNbAtom } from "@/src/sections/analysis/states";
import { DEFAULT_ENGINE, ENGINE_LABELS, STRONGEST_ENGINE } from "@/src/constants";
import { useEffect, useMemo, useState } from "react";
import { isEngineSupported } from "@/src/lib/engine/shared";
import { EngineName } from "@/src/types/enums";

export default function EngineSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [engineName, setEngineName] = useAtom(engineNameAtom);
  const [engineDepth, setEngineDepth] = useAtom(engineDepthAtom);
  const [engineMultiPv, setEngineMultiPv] = useAtom(engineMultiPvAtom);
  const [engineWorkersNb, setEngineWorkersNb] = useAtom(engineWorkersNbAtom);
  const [localEngine, setLocalEngine] = useState(engineName);
  const [localDepth, setLocalDepth] = useState(engineDepth);
  const [localMultiPv, setLocalMultiPv] = useState(engineMultiPv);
  const [localWorkers, setLocalWorkers] = useState(engineWorkersNb);

  useEffect(() => { if (open) { setLocalEngine(engineName); setLocalDepth(engineDepth); setLocalMultiPv(engineMultiPv); setLocalWorkers(engineWorkersNb); } }, [open]);

  const isSupported = useMemo(() => isEngineSupported(localEngine), [localEngine]);

  const apply = () => {
    setEngineName(localEngine);
    setEngineDepth(localDepth);
    setEngineMultiPv(localMultiPv);
    setEngineWorkersNb(localWorkers);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Engine Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl>
            <InputLabel id="engine-variant">Engine</InputLabel>
            <Select labelId="engine-variant" input={<OutlinedInput label="Engine" />} value={localEngine} onChange={(e)=> setLocalEngine(e.target.value as EngineName)}>
              {Object.values(EngineName).map((v)=> (
                <MenuItem key={v} value={v} disabled={!isEngineSupported(v)}>{ENGINE_LABELS[v].full}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {!isSupported && (
            <Typography color="salmon" textAlign="center" marginTop={1}>
              {ENGINE_LABELS[DEFAULT_ENGINE].small} is the default engine if your device does not support {ENGINE_LABELS[STRONGEST_ENGINE].small}. Strongest engine requires a one-time download.
            </Typography>
          )}
          <Typography variant="caption">Depth: {localDepth}</Typography>
          <Slider min={8} max={30} step={1} value={localDepth} onChange={(_,v)=> setLocalDepth(v as number)} />
          <FormControl>
            <InputLabel id="mpv">MultiPV</InputLabel>
            <Select labelId="mpv" input={<OutlinedInput label="MultiPV" />} value={String(localMultiPv)} onChange={(e)=> setLocalMultiPv(Number(e.target.value))}>
              {[1,2,3,4,5,6].map(n => (<MenuItem key={n} value={String(n)}>{n}</MenuItem>))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel id="workers">Workers</InputLabel>
            <Select labelId="workers" input={<OutlinedInput label="Workers" />} value={String(localWorkers)} onChange={(e)=> setLocalWorkers(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map(n => (<MenuItem key={n} value={String(n)}>{n}</MenuItem>))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={apply}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}

