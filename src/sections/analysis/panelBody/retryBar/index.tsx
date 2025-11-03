import { Alert, AlertTitle, Box, Button, Stack, Typography } from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import { boardAtom, retryStateAtom } from "@/src/sections/analysis/states";
import { moveLineUciToSan } from "@/src/lib/chess";

export default function RetryBar() {
  const [retry, setRetry] = useAtom(retryStateAtom);
  const board = useAtomValue(boardAtom);
  if (!retry?.active) return null;

  const toSan = moveLineUciToSan(retry.baseFen || board.fen());
  const allowedSan = (retry.allowedUci || []).map((u) => toSan(u));

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 10 }}>
      <Alert severity={retry.success ? 'success' : (retry.attemptsLeft && retry.attemptsLeft > 0 ? 'info' : 'warning')} sx={{ py: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Box>
            <AlertTitle sx={{ mb: 0.5 }}>Retry Mode</AlertTitle>
            <Typography variant="body2">{retry.message || 'Play one of the engine-recommended candidates.'}</Typography>
            <Typography variant="caption" color="text.secondary">Attempts left: {retry.attemptsLeft ?? 0}{allowedSan.length ? ` · Candidates: ${allowedSan.join(', ')}` : ''}</Typography>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            {retry.success && (
              <Button size="small" sx={{ mr: 1 }} onClick={() => setRetry({ active: false })}>Finish</Button>
            )}
            {!retry.success && (
              <Button size="small" sx={{ mr: 1 }} onClick={() => setRetry({ ...retry, message: `Correct move: ${allowedSan[0] || 'N/A'}`, attemptsLeft: 0 })}>Reveal</Button>
            )}
            <Button size="small" variant="outlined" onClick={() => setRetry({ active: false })}>Exit</Button>
          </Box>
        </Stack>
      </Alert>
    </Box>
  );
}

