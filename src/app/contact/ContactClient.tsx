'use client';

import { Box, Paper, Stack, Typography, Link as MuiLink, Button } from '@mui/material';

// Use the email you provided
const SUPPORT_EMAIL = 'suppotr@chess-analysis.org';

export default function ContactClient() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 3 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, maxWidth: 720, width: '100%', textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Contact Us</Typography>
          <Typography variant="body1" color="text.secondary">
            If you find a bug or have an idea that could make this site better, we would love to hear from you.
            Please send us an email and include any helpful details such as steps to reproduce, screenshots,
            your browser version, and (if relevant) a PGN or FEN.
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }}>
            <MuiLink href={`mailto:${SUPPORT_EMAIL}`} underline="hover">{SUPPORT_EMAIL}</MuiLink>
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }}>
            <Button variant="contained" onClick={() => { try { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Feedback for Chess Analyzer')}`; } catch {} }}>Send Email</Button>
            <Button variant="outlined" onClick={async () => { try { await navigator.clipboard?.writeText?.(SUPPORT_EMAIL); } catch {} }}>Copy Address</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
