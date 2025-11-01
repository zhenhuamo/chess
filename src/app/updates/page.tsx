import { Box, Paper, Stack, Typography, Divider } from '@mui/material';
import type { UpdateEntry } from './updates';
import { UPDATES } from './updates';

export const metadata = {
  title: 'Updates - Chess Analyzer',
  description: 'Release notes and change log for Chess Analyzer.',
};

const byDateDesc = (a: UpdateEntry, b: UpdateEntry) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export default function UpdatesPage() {
  const updates = [...UPDATES].sort(byDateDesc);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: 900 }}>
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center' }}>Updates</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Latest improvements, fixes, and features. This page is updated whenever we ship changes.
          </Typography>
          <Divider />

          <Stack spacing={2}>
            {updates.map((u, idx) => (
              <Paper key={`${u.date}-${idx}`} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {u.date}{u.version ? ` · ${u.version}` : ''}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{u.title}</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 3 }}>
                    {u.items.map((it, i) => (
                      <li key={i}>
                        <Typography variant="body2">{it}</Typography>
                      </li>
                    ))}
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

