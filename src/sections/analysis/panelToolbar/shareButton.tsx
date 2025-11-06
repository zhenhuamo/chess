"use client";
import { Box, IconButton, Tooltip } from "@mui/material";
const Grid: any = Box;
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { gameAtom } from "@/src/sections/analysis/states";
import { SHARE_API_BASE } from "@/src/config/share";

export default function ShareButton() {
  const game = useAtomValue(gameAtom);
  const disabled = game.history().length === 0;

  const onShare = async () => {
    try {
      const pgn = game.pgn();
      const resp = await fetch(`${SHARE_API_BASE}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pgn, meta: { source: 'analyze', moves: game.history().length } }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(()=>'');
        console.error('Share failed', resp.status, text);
        alert('Share failed, please try again later');
        return;
      }
      const data = await resp.json();
      const id = data?.id;
      const url = `${location.origin}/g/${id}`;
      await navigator.clipboard?.writeText?.(url);
      alert('Share link copied:\n' + url);
    } catch (e) {
      console.error('Share exception', e);
      alert('Share failed, please try again later');
    }
  };

  return (
    <Tooltip title="Share as Short Link">
      <Grid>
        <IconButton disabled={disabled} onClick={onShare} sx={{ paddingX: 1.2, paddingY: 0.5 }}>
          <Icon icon="ri:share-forward-line" />
        </IconButton>
      </Grid>
    </Tooltip>
  );
}
