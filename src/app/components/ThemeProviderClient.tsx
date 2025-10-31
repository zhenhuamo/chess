'use client';

import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import SideNav, { getNavWidth } from './SideNav';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Centralized MUI theme (dark, to match the reference look)
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#06b6d4' }, // cyan-ish
    background: { default: '#0a0a0a', paper: '#1f1f1f' },
  },
  shape: { borderRadius: 10 },
});

export default function ThemeProviderClient({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('sidenav-collapsed', true);
  const navWidth = useMemo(() => getNavWidth(collapsed), [collapsed]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SideNav collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Box component="main" sx={{ pl: `${navWidth}px`, minHeight: '100vh', bgcolor: 'background.default' }}>
        {children}
      </Box>
    </ThemeProvider>
  );
}
