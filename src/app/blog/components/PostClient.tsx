'use client';

import { Box, Chip, Stack, Typography, Button } from '@mui/material';
import Link from 'next/link';
import { useMemo } from 'react';

interface Props {
  title: string;
  description?: string;
  date?: string;
  cover?: string;
  html: string;
  // Optional: when provided, we will not re-extract on the client (avoids hydration mismatch)
  leadHtml?: string | null;
  contentHtml?: string;
  siteUrl: string;
  keywords?: string[];
  tags?: string[];
}

// Lightweight blog post layout using MUI on the client for richer visuals.
export default function PostClient({ title, description, date, cover, html, leadHtml: leadHtmlProp, contentHtml: contentHtmlProp, siteUrl, keywords = [], tags = [] }: Props) {
  const displayDate =
    date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '';

  // Extract first <video> (or its wrapping <figure>) as hero media on the client only if server didn't provide it.
  const { leadHtml, contentHtml } = useMemo(() => {
    if (typeof window === 'undefined' || leadHtmlProp !== undefined || contentHtmlProp !== undefined) {
      return { leadHtml: leadHtmlProp ?? null, contentHtml: contentHtmlProp ?? html };
    }
    try {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const firstVideo = wrapper.querySelector('video');
      let leadEl: Element | null = null;
      if (firstVideo) leadEl = firstVideo.closest('figure') || firstVideo;
      if (leadEl) {
        leadEl.querySelectorAll('video').forEach((v) => {
          if (!v.getAttribute('crossorigin')) v.setAttribute('crossorigin', 'anonymous');
          const style = v.getAttribute('style') || '';
          if (!/width:\s*100%/.test(style)) v.setAttribute('style', `${style};width:100%`);
        });
        const extracted = leadEl.outerHTML;
        leadEl.remove();
        return { leadHtml: extracted, contentHtml: wrapper.innerHTML };
      }
    } catch {
      // ignore
    }
    return { leadHtml: null as string | null, contentHtml: html };
  }, [html, leadHtmlProp, contentHtmlProp]);

  return (
    <Stack spacing={2}>
      {/* Hero */}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundImage: [
            'radial-gradient(800px 320px at 15% -10%, rgba(99,102,241,0.20), transparent 60%)',
            'radial-gradient(800px 320px at 85% -10%, rgba(14,165,233,0.18), transparent 60%)',
          ].join(', '),
        }}
      >
        {/* Prefer lead video as hero media; fallback to cover image */}
        {leadHtml ? (
          <Box
            sx={{
              width: '100%',
              display: 'block',
              borderBottom: 1,
              borderColor: 'divider',
            }}
            dangerouslySetInnerHTML={{ __html: leadHtml }}
          />
        ) : cover ? (
          <Box
            component="img"
            alt={title}
            src={cover}
            sx={{
              width: '100%',
              height: 220,
              objectFit: 'cover',
              display: 'block',
              opacity: 0.9,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          />
        ) : null}
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">
              {displayDate}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body1" color="text.secondary">
                {description}
              </Typography>
            ) : null}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {[...(tags || []), ...(keywords || [])]
                .filter(Boolean)
                .slice(0, 8)
                .map((t, i) => (
                  <Chip key={`${t}-${i}`} label={t} size="small" variant="outlined" />
                ))}
            </Box>
            <Box>
              <Button
                LinkComponent={Link}
                href={siteUrl}
                color="primary"
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
              >
                Visit Chess Analyzer
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 2, md: 3 },
          // Styled prose-like defaults
          '& h1, & h2, & h3': { fontWeight: 800, mt: 2, mb: 1 },
          '& p': { color: 'text.secondary', lineHeight: 1.8, my: 1.25 },
          '& ul, & ol': { pl: 3, my: 1.5 },
          '& li': { mb: 0.75 },
          '& a': { color: 'primary.main', textDecoration: 'underline' },
          '& hr': { border: 0, height: 1, bgcolor: 'divider', my: 2 },
          '& blockquote': {
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            pl: 2,
            color: 'text.secondary',
            my: 2,
          },
          '& img': { maxWidth: '100%', borderRadius: 1, border: 1, borderColor: 'divider' },
          '& video': { width: '100%', borderRadius: 1, border: 1, borderColor: 'divider', outline: 'none' },
          '& pre, & code': {
            bgcolor: 'background.paper',
            borderRadius: 1,
            px: 0.5,
            border: 1,
            borderColor: 'divider',
          },
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </Box>
    </Stack>
  );
}
