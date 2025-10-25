'use client';

import { PropsWithChildren } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

