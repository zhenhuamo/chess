import Link from 'next/link';
import { Box, Stack, Typography, Divider } from '@mui/material';

export default function Footer() {
  return (
    <Box component="footer" sx={{ mt: 6, px: { xs: 2, md: 3 }, pb: 4 }}>
      <Divider sx={{ mb: 2, opacity: 0.25 }} />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ color: 'text.secondary', fontSize: 14 }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Chess Analyzer
        </Typography>
        <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem sx={{ opacity: 0.3 }} />}>
          <Link href="/privacy-policy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms-of-service" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
        </Stack>
      </Stack>
    </Box>
  );
}
