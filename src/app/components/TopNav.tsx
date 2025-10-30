'use client';

import { AppBar, Toolbar, Box, Typography, Button, Breadcrumbs } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';

export type Crumb = { label: string; href?: string };

export default function TopNav({ breadcrumbs }: { breadcrumbs?: Crumb[] }) {
  return (
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 2 }}>
        <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', flex: 1 }}>
          <Image src="/logo.png" alt="Chess Analyzer" width={32} height={32} priority />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Chess Analyzer</Typography>
        </Box>
        <Button LinkComponent={Link} href="/play" variant="text" color="inherit">Play</Button>
        <Button LinkComponent={Link} href="/analyze" variant="text" color="inherit">Analyze</Button>
      </Toolbar>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Toolbar variant="dense" sx={{ minHeight: 36, borderTop: 1, borderColor: 'divider' }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ color: 'text.secondary' }}>
            {breadcrumbs.map((c, idx) => c.href ? (
              <Box key={`${c.label}-${idx}`} component={Link} href={c.href} sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { textDecoration: 'underline' } }}>
                {c.label}
              </Box>
            ) : (
              <Typography key={`${c.label}-${idx}`} variant="body2" color="text.primary">{c.label}</Typography>
            ))}
          </Breadcrumbs>
        </Toolbar>
      )}
    </AppBar>
  );
}

