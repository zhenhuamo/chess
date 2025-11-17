import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Paper, Stack, Typography, Chip } from '@mui/material';
import { getAllPostsMeta } from '@/src/lib/blog';

export const metadata: Metadata = {
  title: 'Blog — Chess Analyzer',
  description: 'Articles on chess analysis, openings, and engine evaluation. Free, browser‑based chess analysis board with Stockfish.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndexPage() {
  const posts = await getAllPostsMeta();

  return (
    <Stack spacing={3}>
      {/* Hero */}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 2, md: 3 },
          backgroundImage: [
            'radial-gradient(800px 320px at 15% -10%, rgba(99,102,241,0.20), transparent 60%)',
            'radial-gradient(800px 320px at 85% -10%, rgba(14,165,233,0.18), transparent 60%)',
          ].join(', '),
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Blog
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Guides, release notes, and thoughts on chess analysis and training.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {posts.map((p) => {
          const dateStr = p.data?.date
            ? new Date(p.data.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
            : '';
          const cover = p.data?.cover || 'https://cacle.chess-analysis.org/img/chess-analysis.png';
          return (
            <Paper
              key={p.slug}
              variant="outlined"
              component={Link}
              href={`/blog/${p.slug}`}
              style={{ textDecoration: 'none' }}
              sx={{
                p: 2,
                display: 'flex',
                gap: 2,
                alignItems: 'stretch',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Box
                component="img"
                src={cover}
                alt={p.data?.title || p.slug}
                loading="lazy"
                crossOrigin="anonymous"
                sx={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider', flexShrink: 0 }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography variant="overline" color="text.secondary">
                  {dateStr}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {p.data?.title || p.slug}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.data?.description || ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {(p.data?.tags || p.data?.keywords || []).slice(0, 4).map((t) => (
                    <Chip key={t} size="small" label={t} variant="outlined" />
                  ))}
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
